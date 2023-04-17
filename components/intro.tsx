const Intro = () => {
  return (
    <section className="mt-16 mb-16 md:mb-12">
      <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight md:pr-8">
        Arsalan Bashir
      </h1>
      <h4 className="text-left mt-1 font-serif text-base font-normal max-w-lg text-slate-700 mb-4 leading-7">
        You will find random musings about engineering, math, and poetry here. I
        only write about things I am passionate about. For more frequent
        updates, follow me on{" "}
        <a
          href="https://arslnb.com"
          className="underline hover:text-slate-900 duration-200 transition-colors"
        >
          twitter
        </a>
        .
      </h4>
      <h4 className="text-left mt-1 font-serif text-base font-normal max-w-lg text-slate-700 leading-7">
        I'm building{" "}
        <a
          href="https://livedocs.com"
          className="underline hover:text-slate-900 duration-200 transition-colors"
        >
          Livedocs
        </a>
        {", "}
        an AI data analyst for every team.
      </h4>
    </section>
  );
};

export default Intro;
