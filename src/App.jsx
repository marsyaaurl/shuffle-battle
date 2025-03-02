import React, { useState } from "react";
import axios from "axios";
import "./App.css";
import Aurora from "./assets/Aurora";

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

let token = null;
let tokenExpirationTime = null;

const getToken = async () => {
  if (token && tokenExpirationTime > Date.now()) {
    return token; // Gunakan token yang ada jika masih valid
  }

  try {
    const encodedCredentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${encodedCredentials}`,
        },
      }
    );

    token = response.data.access_token;
    tokenExpirationTime = Date.now() + response.data.expires_in * 1000; // expires_in dalam detik
    console.log("New token generated:", token);
    return token;
  } catch (error) {
    console.error("Error fetching token:", error);
    throw new Error("Failed to get access token");
  }
};

const getPlaylistInfo = async (playlistId) => {
  try {
    const token = await getToken();
    const response = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("Playlist Info Response:", response.data); // Logging untuk debugging
    const playlistName = response.data.name;
    const playlistImage = response.data.images[0]?.url || ""; // Perbaikan di sini

    return {
      name: playlistName,
      image: playlistImage,
    };
  } catch (error) {
    console.error("Error fetching playlist info:", error);
    throw new Error("Failed to fetch playlist info");
  }
};

const getPlaylistTracks = async (playlistId) => {
  try {
    const token = await getToken();
    const response = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("Playlist Tracks Response:", response.data);
    if (!response.data.items || response.data.items.length === 0) {
      throw new Error("No tracks found in the playlist");
    }

    const tracks = response.data.items
      .filter(item => item.track && item.track.id)
      .map(item => ({
        id: item.track.id,
        popularity: item.track.popularity || 0,
      }));

    return tracks;
  } catch (error) {
    console.error("Error fetching playlist:", error);
    throw new Error("Failed to fetch playlist data");
  }
};

const calculateAveragePopularity = (tracks) => {
  if (tracks.length === 0) return 0;
  const totalPopularity = tracks.reduce((sum, track) => sum + (track.popularity || 0), 0);
  return totalPopularity / tracks.length;
};

const determineWinner = async (playlist1Id, playlist2Id) => {
  try {
    const tracks1 = await getPlaylistTracks(playlist1Id);
    const tracks2 = await getPlaylistTracks(playlist2Id);

    const info1 = await getPlaylistInfo(playlist1Id);
    const info2 = await getPlaylistInfo(playlist2Id);

    if (tracks1.length === 0 || tracks2.length === 0) {
      throw new Error("One of the playlists has no tracks.");
    }

    const avgPopularity1 = calculateAveragePopularity(tracks1);
    const avgPopularity2 = calculateAveragePopularity(tracks2);

    let winner;
    if (avgPopularity1 > avgPopularity2) {
      winner = { ...info2, message: `${info2.name} is more underground, smell some good taste in there!` };
    } else if (avgPopularity1 < avgPopularity2) {
      winner = { ...info1, message: `${info1.name} is more underground, smell some good taste in there!` };
    } else {
      winner = { message: "Both playlists are equally underground!" };
    }

    return winner;
  } catch (error) {
    console.error("Error in determineWinner:", error);
    throw new Error("Failed to determine winner");
  }
};

function App() {
  const [playlist1, setPlaylist1] = useState("");
  const [playlist2, setPlaylist2] = useState("");
  const [result, setResult] = useState({ message: "", image: "", name: "" }); // Perbaikan di sini
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult({ message: "Calculating...", image: "", name: "" }); // Reset result
    setIsLoading(true);

    if (!playlist1 || !playlist2) {
      setResult({ message: "Please fill in all fields!", image: "", name: "" });
      setIsLoading(false);
      return;
    }

    const extractPlaylistId = (url) => {
      const match = url.match(/playlist\/([a-zA-Z0-9]{22})/);
      if (!match) {
        console.error("Invalid playlist URL:", url);
        return null;
      }
      return match[1];
    };

    const playlist1Id = extractPlaylistId(playlist1);
    const playlist2Id = extractPlaylistId(playlist2);

    console.log("Playlist 1 ID:", playlist1Id);
    console.log("Playlist 2 ID:", playlist2Id);

    if (!playlist1Id || !playlist2Id) {
      setResult({ message: "Invalid playlist link!", image: "", name: "" });
      setIsLoading(false);
      return;
    }

    try {
      const winner = await determineWinner(playlist1Id, playlist2Id);
      setResult(winner);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setResult({ message: "Error fetching playlist data!", image: "", name: "" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed w-full h-screen flex items-start justify-center z-0">
        <Aurora colorStops={["#1DB954", "#1ED760", "#1FDF64"]} blend={0.5} amplitude={1.0} speed={0.5} className="absolute top-24" />
      </div>
      <div className="relative flex flex-col items-center justify-center h-screen gap-3 z-10">
        <h1 className="font-extrabold text-5xl text-white">Shuffle Battle</h1>
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-2">
          <input
            type="text"
            placeholder="Enter Playlist Link"
            value={playlist1}
            onChange={(e) => setPlaylist1(e.target.value)}
            className="bg-[#323232] rounded-md border-[#d9d9d9] w-56 h-8 p-2 text-sm font-extralight text-white"
          />
          <h2 className="font-extrabold text-white text-md">VS</h2>
          <input
            type="text"
            placeholder="Enter Playlist Link"
            value={playlist2}
            onChange={(e) => setPlaylist2(e.target.value)}
            className="bg-[#323232] rounded-md border-[#d9d9d9] w-56 h-8 p-2 text-sm font-extralight text-white"
          />
          <button type="submit" className="bg-[#1DB954] rounded-md w-56 h-8 text-md font-bold text-white">Battle</button>
        </form>

        {/* Tampilkan info playlist yang menang */}
        {result.message && (
          <div className="text-center mt-4">
            {result.image && (
              <img src={result.image} alt="Winner Playlist Cover" className="w-24 h-24 rounded-lg mx-auto" />
            )}
            <p className="text-white font-bold mt-2">{result.message}</p>
          </div>
        )}
      </div>
    </>
  );
}

export default App;