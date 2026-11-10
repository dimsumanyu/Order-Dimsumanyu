import React, { useState, useRef, useEffect } from 'react';
import { Search, Flame, X, ChevronDown, Check, UtensilsCrossed } from 'lucide-react';
import { MenuItem } from '../types';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  showBestSellerOnly: boolean;
  onToggleBestSeller: () => void;
  menuItems?: MenuItem[];
}

const getCategoryIcon = (cat: string) => {
  const upper = cat.toUpperCase();
  if (upper === 'ALL') return '🍽️';
  if (upper.includes('KUKUS')) return '🥟';
  if (upper.includes('GORENG')) return '🥟';
  if (upper.includes('FAMILY')) return '🍱';
  if (upper.includes('MIX')) return '🎁';
  if (upper.includes('SATUAN')) return '🥢';
  if (upper.includes('FROZEN')) return '❄️';
  if (upper.includes('DRINK') || upper.includes('MINUM')) return '🥤';
  if (upper.includes('SAUS') || upper.includes('CHILI')) return '🌶️';
  return '🥢';
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  showBestSellerOnly,
  onToggleBestSeller,
  menuItems = [],
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getCategoryCount = (cat: string) => {
    if (!menuItems || menuItems.length === 0) return null;
    if (cat === 'ALL') return menuItems.length;
    return menuItems.filter((m) => m.kategori.trim().toUpperCase() === cat.toUpperCase()).length;
  };

  const selectedLabel = selectedCategory === 'ALL' ? 'Semua Menu' : selectedCategory;
  const isCustomCategoryActive = selectedCategory !== 'ALL';

  return (
    <div className="space-y-2.5">
      {/* Search Bar & Dropdown Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* 1. Search Bar */}
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer p-0.5"
              title="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 2. Controls Row: Category Dropdown & Best Seller */}
        <div className="flex items-center gap-2">
          {/* 📂 Category Dropdown Button */}
          <div className="relative flex-1 sm:flex-none" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-expanded={isDropdownOpen}
              className={`w-full sm:w-auto flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition border cursor-pointer shadow-xs select-none ${
                isCustomCategoryActive
                  ? 'bg-red-50 text-red-700 border-red-300 ring-2 ring-red-100 font-extrabold'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-sm shrink-0">{getCategoryIcon(selectedCategory)}</span>
                <span className="truncate max-w-[150px] sm:max-w-[190px]">
                  {selectedLabel}
                </span>
                {getCategoryCount(selectedCategory) !== null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                      isCustomCategoryActive
                        ? 'bg-red-200 text-red-800'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {getCategoryCount(selectedCategory)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {isCustomCategoryActive && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCategory('ALL');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        onSelectCategory('ALL');
                      }
                    }}
                    className="p-0.5 hover:bg-red-200 text-red-600 rounded-full transition cursor-pointer"
                    title="Kembalikan ke Semua Menu"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180 text-red-600' : ''
                  }`}
                />
              </div>
            </button>

            {/* 📋 Floating Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-full sm:w-72 bg-white rounded-2xl shadow-xl border border-stone-200 p-1.5 z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150 max-h-80 overflow-y-auto no-scrollbar">
                <div className="px-2.5 py-1.5 border-b border-stone-100 flex items-center justify-between text-[11px] text-stone-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <UtensilsCrossed className="w-3 h-3 text-red-600" />
                    <span>Pilih Kategori Menu</span>
                  </span>
                  <span>{categories.length} Kategori</span>
                </div>

                <div className="py-1 space-y-0.5">
                  {categories.map((cat) => {
                    const isActive = selectedCategory === cat;
                    const label = cat === 'ALL' ? 'Semua Menu' : cat;
                    const count = getCategoryCount(cat);

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          onSelectCategory(cat);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer active:scale-[0.99] ${
                          isActive
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-sm shrink-0">{getCategoryIcon(cat)}</span>
                          <span className="truncate">{label}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {count !== null && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                isActive
                                  ? 'bg-red-700/80 text-white'
                                  : 'bg-stone-100 text-stone-500'
                              }`}
                            >
                              {count}
                            </span>
                          )}
                          {isActive && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 🔥 Best Seller Filter Button */}
          <button
            type="button"
            onClick={onToggleBestSeller}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border cursor-pointer shrink-0 shadow-xs active:scale-95 ${
              showBestSellerOnly
                ? 'bg-amber-500 text-white border-amber-600 shadow-amber-200'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
            title="Filter hanya menu Best Seller"
          >
            <Flame
              className={`w-3.5 h-3.5 ${
                showBestSellerOnly ? 'text-white' : 'text-amber-500 fill-amber-500'
              }`}
            />
            <span className="hidden xs:inline">Hanya Best Seller</span>
            <span className="xs:hidden">Best Seller</span>
          </button>
        </div>
      </div>

      {/* 🏷️ Active Filter Tag Indicator */}
      {(isCustomCategoryActive || showBestSellerOnly || searchQuery) && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-0.5">
          <span className="text-stone-400 font-medium">Filter aktif:</span>

          {isCustomCategoryActive && (
            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-lg font-bold">
              <span>{getCategoryIcon(selectedCategory)} {selectedLabel}</span>
              <button
                type="button"
                onClick={() => onSelectCategory('ALL')}
                className="hover:text-red-900 cursor-pointer p-0.5"
                title="Hapus filter kategori"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {showBestSellerOnly && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg font-bold">
              <span>🔥 Best Seller</span>
              <button
                type="button"
                onClick={onToggleBestSeller}
                className="hover:text-amber-950 cursor-pointer p-0.5"
                title="Hapus filter best seller"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {searchQuery && (
            <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 border border-stone-200 px-2 py-0.5 rounded-lg font-bold">
              <span>Cari: &ldquo;{searchQuery}&rdquo;</span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="hover:text-stone-900 cursor-pointer p-0.5"
                title="Hapus kata kunci pencarian"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              onSelectCategory('ALL');
              if (showBestSellerOnly) onToggleBestSeller();
              if (searchQuery) onSearchChange('');
            }}
            className="text-[10px] text-stone-400 hover:text-red-600 underline cursor-pointer ml-1 font-semibold"
          >
            Reset Semua
          </button>
        </div>
      )}
    </div>
  );
};
