import Link from "next/link";

type Props = {
  title: string;
  date: string;
  excerpt: string;
  slug: string;
};

const PostPreview = ({ title, date, excerpt, slug }: Props) => {
  return (
    <div className="mb-3 max-w-fit group hover:bg-slate-50 rounded-xl px-4 py-3 relative -left-4">
      <Link as={`/posts/${slug}`} href="/posts/[slug]">
        <h3 className="text-xl leading-snug font-bold tracking-tight group-hover:underline">
          {title}
        </h3>
        <p className="font-serif text-sm font-normal max-w-xl text-slate-600 leading-7 truncate">
          {excerpt}
        </p>
      </Link>
    </div>
  );
};

export default PostPreview;
