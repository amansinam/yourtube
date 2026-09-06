import { useState } from "react";

const CATEGORIES = [
  "All",
  "Music",
  "Gaming",
  "News",
  "Live",
  "Coding",
  "Movies",
  "Comedy",
  "Sports",
  "Learning",
  "Podcasts",
];

export default function CategoryTabs({
  onSelect,
}: {
  onSelect?: (category: string) => void;
}) {
  const [active, setActive] = useState("All");

  function handleClick(cat: string) {
    setActive(cat);
    onSelect?.(cat);
  }

  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-3 border-b border-gray-100 no-scrollbar">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => handleClick(cat)}
          className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm ${
            active === cat
              ? "bg-black text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-900"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
