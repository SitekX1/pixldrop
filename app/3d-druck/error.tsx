"use client";

export default function ShopFehler({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="shop" style={{ minHeight: "60vh" }}>
      <div className="shop-wrap" style={{ paddingTop: 40 }}>
        <div className="shop-alert" role="alert">
          <strong>Das hat nicht geklappt.</strong>
          <p>Deine Eingaben sind noch da. Bitte nochmal versuchen oder an as@sitekx.de schreiben.</p>
          <div className="shop-actions">
            <button type="button" className="shop-btn" onClick={reset}>Nochmal versuchen</button>
          </div>
        </div>
      </div>
    </div>
  );
}
