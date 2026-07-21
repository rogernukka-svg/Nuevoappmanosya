export default function Brand({ size = "md" }) {
  const sizes = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-6xl",
  };

  return (
    <span className={`brand-wordmark ${sizes[size] || sizes.md}`}>
      Manos<span className="brand-ya">YA</span>
    </span>
  );
}
