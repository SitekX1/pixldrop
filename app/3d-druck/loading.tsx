export default function ShopLaedt() {
  return (
    <div className="shop" aria-busy="true">
      <div className="shop-wrap" style={{ paddingTop: 80 }}>
        <p className="sr-only shop-sr" role="status">Wird geladen</p>
        <ul className="shop-grid" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <li key={i}><div className="shop-skeleton" /></li>)}
        </ul>
      </div>
    </div>
  );
}
