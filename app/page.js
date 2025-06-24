"use client";
import { useState } from "react";
import Image from "next/image";

export default function Home() {
  const [username1, setUsername1] = useState("");
  const [username2, setUsername2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overlap, setOverlap] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setOverlap([]);
    if (!username1 || !username2) {
      setError("Please enter both usernames.");
      return;
    }
    setLoading(true);
    try {
      // Helper to fetch all pages of a user's collection via local API route
      async function fetchAllReleases(username) {
        let page = 1;
        let all = [];
        let totalPages = 1;
        do {
          const res = await fetch(`/api/discogs?username=${encodeURIComponent(username)}&per_page=100&page=${page}`);
          if (!res.ok) throw new Error("One or both users not found or collections are private.");
          const data = await res.json();
          all = all.concat(data.releases || []);
          if (page === 1 && data.pagination) {
            totalPages = data.pagination.pages;
          }
          page++;
        } while (page <= totalPages);
        return all;
      }
      // Fetch all releases for both users
      const [releases1, releases2] = await Promise.all([
        fetchAllReleases(username1),
        fetchAllReleases(username2)
      ]);
      // Debug UI info
      setDebugInfo({
        user1: { count: releases1.length, titles: releases1.slice(0, 10).map(r => r.basic_information.title) },
        user2: { count: releases2.length, titles: releases2.slice(0, 10).map(r => r.basic_information.title) },
      });
      // Debug: log fetched releases
      console.log('User 1 releases:', releases1);
      console.log('User 2 releases:', releases2);
      // Helper to normalize title and artist for fallback matching
      function normalize(str) {
        return str.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
      }
      function getKey(r) {
        if (r.basic_information.master_id) return `m_${r.basic_information.master_id}`;
        // fallback: normalized title + artist
        const title = normalize(r.basic_information.title || "");
        const artist = normalize((r.basic_information.artists?.map(a => a.name).join("") || ""));
        return `t_${title}_a_${artist}`;
      }
      // Build maps of key -> all releases for each user
      const map1 = new Map();
      for (const r of releases1) {
        const key = getKey(r);
        if (!map1.has(key)) map1.set(key, []);
        map1.get(key).push(r);
      }
      const map2 = new Map();
      for (const r of releases2) {
        const key = getKey(r);
        if (!map2.has(key)) map2.set(key, []);
        map2.get(key).push(r);
      }
      // Debug: log generated keys
      console.log('User 1 keys:', Array.from(map1.keys()));
      console.log('User 2 keys:', Array.from(map2.keys()));
      // Find shared keys
      const sharedKeys = Array.from(map1.keys()).filter(k => map2.has(k));
      // Debug: log shared keys
      console.log('Shared keys:', sharedKeys);
      // For each shared album, collect all versions each user owns
      const overlapAlbums = sharedKeys.map(key => ({
        key,
        user1: map1.get(key),
        user2: map2.get(key),
        // Use the first release as the representative for display (for cover/title)
        display: map1.get(key)[0] || map2.get(key)[0],
      }));
      setOverlap(overlapAlbums);
    } catch (err) {
      setError(err.message || "Failed to fetch collections. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Discogs Collection Overlap</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md bg-white p-6 rounded shadow">
        <input
          type="text"
          placeholder="First Discogs username"
          value={username1}
          onChange={e => setUsername1(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Second Discogs username"
          value={username2}
          onChange={e => setUsername2(e.target.value)}
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white rounded p-2 font-semibold hover:bg-blue-700 transition"
          disabled={loading}
        >
          {loading ? "Comparing..." : "Find Overlap"}
        </button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </form>
      <div className="mt-8 w-full">
        {overlap.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center">Shared Albums</h2>
            <div className="grid gap-8 w-full grid-cols-[repeat(auto-fit,minmax(160px,1fr))]" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              {overlap.map((album) => (
                <div key={album.key} className="bg-white rounded shadow p-4 flex flex-col items-center h-full w-full min-w-[160px] max-w-[160px] mx-auto">
                  <img
                    src={album.display.basic_information.cover_image}
                    alt={album.display.basic_information.title}
                    className="w-32 h-32 object-cover mb-2 rounded"
                  />
                  <div className="font-bold text-center">{album.display.basic_information.title}</div>
                  <div className="text-sm text-gray-600 text-center mb-2">
                    {album.display.basic_information.artists?.map(a => a.name).join(", ")}
                  </div>
                  <div className="w-full">
                    <div className="text-xs font-semibold text-blue-700 mb-1">User 1's versions:</div>
                    <ul className="mb-2">
                      {album.user1.map(r => (
                        <li key={r.id} className="text-xs text-gray-700">
                          {r.basic_information.title} ({r.basic_information.year})
                          {r.basic_information.master_id && (
                            <a href={`https://www.discogs.com/master/${r.basic_information.master_id}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 underline">master</a>
                          )}
                          <a href={`https://www.discogs.com/release/${r.id}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 underline">release</a>
                        </li>
                      ))}
                    </ul>
                    <div className="text-xs font-semibold text-green-700 mb-1">User 2's versions:</div>
                    <ul>
                      {album.user2.map(r => (
                        <li key={r.id} className="text-xs text-gray-700">
                          {r.basic_information.title} ({r.basic_information.year})
                          {r.basic_information.master_id && (
                            <a href={`https://www.discogs.com/master/${r.basic_information.master_id}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 underline">master</a>
                          )}
                          <a href={`https://www.discogs.com/release/${r.id}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 underline">release</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {overlap.length === 0 && !loading && (
          <div className="text-center text-gray-500">No shared albums found.</div>
        )}
      </div>
      <div className="mt-4 w-full">
        {debugInfo && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-4 mb-4 rounded">
            <div className="font-bold mb-1">Debug Info</div>
            <div>User 1: {debugInfo.user1.count} releases. Sample: {debugInfo.user1.titles.join(", ")}</div>
            <div>User 2: {debugInfo.user2.count} releases. Sample: {debugInfo.user2.titles.join(", ")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
