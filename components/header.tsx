import Link from "next/link";

const Header = () => {
  return (
    <h2 className="text-lg md:text-xl font-bold tracking-tight md:tracking-tighter leading-tight mb-20 mt-8">
      <Link href="/" className="hover:underline">
        back to homepage
      </Link>
    </h2>
  );
};

export default Header;
