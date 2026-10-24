import React from 'react';
import { Search, Flame, X } from 'lucide-react';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  showBestSellerOnly: boolean;
  onToggleBestSeller: () => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  showBestSellerOnly,
  onToggleBestSeller,
}) => {
  return (
    <div className="space-y-3">
      {/* Search Bar & Best Seller filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari dimsum (kukus, mentai, goreng, thai tea)..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-white border border-stone-200 focus:border-red-600 focus:ring-2 focus:ring-red-100 outline-none text-xs text-stone-800 transition placeholder:text-stone-400 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={onToggleBestSeller}
          className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
            showBestSellerOnly
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${showBestSellerOnly ? 'text-white' : 'text-amber-500 fill-amber-500'}`} />
          <span>Hanya Best Seller</span>
        </button>
      </div>

      {/* Horizontal Category Pills */}
      <div className="overflow-x-auto no-scrollbar flex space-x-2 py-1 -mx-1 px-1">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          const label = cat === 'ALL' ? '🍽️ Semua Menu' : cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-red-600 text-white shadow-sm shadow-red-700/30'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
