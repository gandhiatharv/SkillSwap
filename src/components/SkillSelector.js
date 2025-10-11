import React from "react";

/*
  Reusable SkillSelector
  Props:
   - title
   - skills, category, subcategory
   - onCategoryChange, onSubcategoryChange
   - subcategories
   - tempSelected, setTempSelected, addSelected
   - searchValue, setSearchValue, searchResults, addFromSearch
   - selectedSkills, removeSelectedSkill (array of names)
*/
export default function SkillSelector({
  title,
  skills,
  category,
  subcategory,
  onCategoryChange,
  onSubcategoryChange,
  subcategories,
  tempSelected,
  setTempSelected,
  addSelected,
  searchValue,
  setSearchValue,
  searchResults,
  addFromSearch,
  selectedSkills,
  removeSelectedSkill,
}) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-semibold mb-2">{title}</h2>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select
          className="flex-1 rounded-lg p-2 text-gray-900 font-medium"
          value={category || ""}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">All Categories</option>
          {[...new Set(skills.map((s) => s.category).filter(Boolean))]
            .sort()
            .map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
        </select>

        <select
          className="flex-1 rounded-lg p-2 text-gray-900 font-medium"
          value={subcategory || ""}
          onChange={(e) => onSubcategoryChange(e.target.value)}
          disabled={!category}
        >
          <option value="">All Subcategories</option>
          {subcategories.map((subcat) => (
            <option key={subcat} value={subcat}>
              {subcat}
            </option>
          ))}
        </select>
      </div>

      {/* Multi-select */}
      <select
        multiple
        className="w-full rounded-lg p-3 text-gray-900 font-medium h-32 mb-3"
        value={tempSelected}
        onChange={(e) =>
          setTempSelected(Array.from(e.target.selectedOptions, (opt) => opt.value))
        }
        size={8}
      >
        {skills
          .filter((s) => (!category || s.category === category))
          .filter((s) => (!subcategory || s.subcategory === subcategory))
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          .map(({ id, name }) => (
            <option key={id} value={name}>
              {name}
            </option>
          ))}
      </select>

      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={addSelected}
          disabled={tempSelected.length === 0}
          className="bg-purple-600 hover:bg-purple-700 px-5 py-2 rounded-full font-semibold"
        >
          Add Selected
        </button>
        <p className="italic text-purple-300 text-sm">
          OR search a category, subcategory, or skill:
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search here..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="w-full rounded-lg p-2 mb-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-400"
        autoComplete="off"
      />
      {searchValue && searchResults.length > 0 && (
        <ul className="max-h-48 overflow-auto bg-purple-900 bg-opacity-80 rounded-lg mb-4 shadow-inner">
          {searchResults.map(({ id, category, subcategory, name }) => (
            <li
              key={id}
              onClick={() => addFromSearch(name)}
              className="cursor-pointer px-3 py-2 hover:bg-purple-700 transition"
              title={`Add ${name}`}
            >
              <strong>{category}</strong> &gt; <em>{subcategory}</em> &gt; {name}
            </li>
          ))}
        </ul>
      )}

      {/* Selected skill chips */}
      <div className="flex flex-wrap gap-2">
        {selectedSkills.map((skill) => (
          <div
            key={skill}
            className="bg-purple-800 bg-opacity-70 rounded-full px-4 py-1 flex items-center gap-2"
          >
            <span>{skill}</span>
            <button
              onClick={() => removeSelectedSkill(skill)}
              className="text-purple-300 hover:text-white font-bold"
              aria-label={`Remove ${skill}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
