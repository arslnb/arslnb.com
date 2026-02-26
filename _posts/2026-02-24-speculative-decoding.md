---
layout: post
title: "Guess First, Verify Later"
description: "Speculative decoding gets you 2-3x LLM throughput with zero quality loss. The trick: verification is almost free."
date: 2026-02-24
---

Autoregressive language models generate one token at a time. Each token requires a full forward pass through the model. For a 70B parameter model, that means 70 billion multiply-accumulate operations per token, bottlenecked by memory bandwidth. At 30 tokens per second, generating a 1,000-token response takes 33 seconds.

Speculative decoding is the most elegant trick I have seen to make this faster without touching the model weights, without retraining, and without sacrificing output quality. Here is how it works.

## The bottleneck

LLM inference is memory-bandwidth-bound, not compute-bound. A single token generation requires reading the entire model from memory (or at least the KV cache and the active weight matrices). On an A100 with 2 TB/s memory bandwidth, reading 140 GB of weights (70B params in fp16) takes ~70ms. That gives you about 14 tokens per second, regardless of how fast your matrix multiply hardware is.

The GPU's tensor cores are idle most of the time. They can do the math in microseconds, but they are waiting for data to arrive from HBM.

This is the key insight: verification is almost free when you batch it.

## The core idea

Speculative decoding uses two models:

- A **draft model** (small, fast, cheap) that generates candidate tokens quickly.
- A **target model** (large, slow, accurate) that verifies the candidates in parallel.

The draft model generates K tokens speculatively. The target model then verifies all K tokens in a single forward pass. If the draft tokens match what the target would have generated, you get K tokens for the cost of one target forward pass. If some tokens are wrong, you keep the correct prefix and re-draft from the rejection point.

```
function speculative_decode(target, draft, prompt, K):
    tokens = prompt
    while not done:
        # Draft phase: generate K candidates cheaply
        draft_tokens = []
        draft_probs = []
        for i in range(K):
            p_draft = draft.forward(tokens + draft_tokens)
            t = sample(p_draft)
            draft_tokens.append(t)
            draft_probs.append(p_draft[t])

        # Verify phase: run target on all K candidates at once
        # This is ONE forward pass, not K forward passes
        target_probs = target.forward_batch(
            tokens, draft_tokens  # all positions in parallel
        )

        # Accept/reject each draft token
        accepted = 0
        for i in range(K):
            p_t = target_probs[i][draft_tokens[i]]
            p_d = draft_probs[i]

            if p_t >= p_d:
                # Target agrees: accept unconditionally
                accepted += 1
            else:
                # Rejection sampling: accept with probability p_t / p_d
                if random() < p_t / p_d:
                    accepted += 1
                else:
                    # Reject: sample from adjusted distribution
                    adjusted = normalize(max(0, target_probs[i] - draft_probs_i))
                    correction_token = sample(adjusted)
                    tokens.extend(draft_tokens[:i] + [correction_token])
                    break

        if accepted == K:
            # All accepted, bonus: sample one more from target
            bonus = sample(target_probs[K])
            tokens.extend(draft_tokens + [bonus])

    return tokens
```

## Why verification is cheap

The magic is that verifying K tokens costs almost the same as generating one token. In the standard autoregressive case:

```
Generate 1 token:   read weights once, compute one output position
Generate K tokens:  read weights K times, compute K output positions
```

But with batched verification:

```
Verify K tokens:    read weights once, compute K output positions in parallel
```

The weight-reading cost (the bottleneck) is paid once. The compute for K positions is parallelized across tensor cores that were otherwise idle. For K=5, you get nearly 5x throughput if the draft model's acceptance rate is high enough.

## The acceptance rate matters

The speedup is:

```
speedup = (accepted_tokens + 1) / (time_draft_K + time_target_1)
```

If the draft model is good (high acceptance rate), you accept most tokens and get close to Kx speedup. If the draft model is bad, you reject early and fall back to normal decoding with some overhead.

In practice, the acceptance rate depends on how well the draft model approximates the target. Some empirical numbers from the literature:

| Draft model | Target model | Acceptance rate | Speedup |
|---|---|---|---|
| 125M GPT-2 | 1.5B GPT-2 | ~70% | 2-3x |
| 7B LLaMA | 70B LLaMA | ~60-80% | 2-3x |
| 1B distilled | 8B base | ~75% | 2.5x |

The acceptance rate varies by domain. Code completion tends to be more predictable (higher acceptance) than creative writing (lower acceptance). Structured outputs like JSON are very high acceptance because the draft model can predict formatting tokens nearly perfectly.

## The math: why it is lossless

The remarkable property of speculative decoding is that it produces the exact same output distribution as the target model alone. This is not an approximation.

The rejection sampling step ensures this. When the draft proposes token x with probability q(x) and the target would generate it with probability p(x):

- If p(x) >= q(x): accept always. The draft underestimated this token; accepting is safe.
- If p(x) < q(x): accept with probability p(x)/q(x). Reject with probability 1 - p(x)/q(x), and in that case, sample from the residual distribution norm(max(0, p - q)).

This is a standard importance sampling correction. The resulting distribution over generated tokens is exactly p(x), the target model's distribution. No quality loss.

```
Proof sketch:
P(accept x) = q(x) * min(1, p(x)/q(x))
            = min(q(x), p(x))

P(reject at position i, then sample y from residual)
            = (1 - sum_x min(q(x), p(x))) * (p(y) - min(q(y), p(y))) / Z

Sum of both: p(x) for all x. QED.
```

## Practical considerations

**Draft model selection.** The draft model needs to be much faster than the target. A good rule of thumb: the draft should be 10-50x smaller. If your target is 70B, use a 1-7B draft. The draft model does not need to be architecturally identical, but sharing the tokenizer is important.

**Choosing K.** Larger K means more speculative tokens and higher potential throughput, but also more wasted compute on rejected tokens. K=4 to K=8 is the sweet spot for most configurations. Beyond K=8, the marginal acceptance rate drops below the compute cost.

**Tree-structured speculation.** Instead of generating one draft sequence, generate a tree of candidates and verify the whole tree in one pass. This increases the expected number of accepted tokens but adds implementation complexity.

```
Standard:   a -> b -> c -> d -> e       (one path, K=5)

Tree:       a -> b -> c -> d
                 |         \-> e
                 \-> f -> g
                          \-> h         (multiple paths, same verify cost)
```

Medusa (ICML 2024) and SpecInfer use this approach. The tree structure can push effective acceptance rates above 90%.

**Self-speculation.** You do not strictly need a separate draft model. Early-exit techniques use the target model's intermediate layers as the draft. Layer 16 of a 64-layer model is a weak but fast predictor. This avoids serving two models entirely.

**KV cache management.** Draft tokens that are rejected create wasted KV cache entries. You need to efficiently roll back the KV cache to the last accepted position. This is straightforward but easy to get wrong in a production serving framework.

## Where it is headed

Speculative decoding is becoming standard infrastructure. vLLM, TensorRT-LLM, and SGLang all support it natively. The interesting frontier is:

1. **Adaptive K.** Adjust the speculation length per token based on the draft model's confidence. High-confidence runs get K=8, low-confidence runs get K=2.

2. **Speculative tool use.** In an agent loop, the model often follows predictable patterns: read file, think, edit file. You could speculatively execute the tool call before the model finishes generating, and verify the output matches. If the model was going to call `file_read("main.py")` and you already read it, you save the I/O latency.

3. **Cascade speculation.** Three models: tiny (100M), small (1B), large (70B). The tiny model drafts, the small model verifies and re-drafts rejections, the large model does final verification. Each stage filters out easy tokens, so the large model only sees the hard decisions.

4. **Hardware co-design.** The speculation paradigm changes the optimal hardware balance. You want more memory bandwidth (for the target pass) and more parallel compute (for tree verification), but less sequential throughput. This favors wide, memory-bandwidth-optimized chips over deep pipelines.

## The takeaway

Speculative decoding is rare in ML: a technique that gives you a 2-3x speedup with zero quality loss and no retraining. It works because it exploits a fundamental asymmetry in transformer inference -- verification is parallel, generation is sequential.

If you are serving LLMs in production and not using speculative decoding, you are leaving 50-70% of your throughput on the table.
