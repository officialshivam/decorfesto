function CategoryCard({ category }) {
  return (
    <article className="category-card">
      <div className="category-card__icon" aria-hidden="true">
        {category.icon}
      </div>
      <h3>{category.name}</h3>
      <p>{category.description}</p>
      <span className="category-card__tag">{category.tag}</span>
    </article>
  );
}

export default CategoryCard;
