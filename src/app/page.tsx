"use client";

import { useState } from "react";

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => setCount((prev) => prev + 1)}>add</button>
      <button onClick={() => setCount((prev) => prev - 1)}>decrease</button>
    </div>
  );
}
