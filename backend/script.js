const axios = require("axios");
const { MongoClient } = require("mongodb");
const dns = require("dns");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const API_KEY = process.env.RAWG_API_KEY;
const MONGODB_URL = process.env.MONGODB_URL;

function createSlug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function configureDns() {
  if (!process.env.MONGODB_DNS_SERVERS) return;

  const servers = process.env.MONGODB_DNS_SERVERS
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  if (servers.length) {
    dns.setServers(servers);
  }
}

async function seedGames() {
  let client;

  try {
    if (!API_KEY) throw new Error("RAWG_API_KEY nao definida no backend/.env");
    if (!MONGODB_URL) throw new Error("MONGODB_URL nao definida no backend/.env");

    configureDns();

    client = new MongoClient(MONGODB_URL);
    await client.connect();

    const db = client.db("gamevault");
    const games = db.collection("games");

    await games.createIndex({ slug: 1 });
    await games.createIndex(
      { external_id: 1 },
      { unique: true, partialFilterExpression: { external_id: { $type: "string" } } }
    );

    console.log("Mongo conectado");

    let totalInseridos = 0;

    for (let page = 1; page <= 3; page++) {
      console.log(`Buscando pagina ${page}...`);

      const response = await axios.get(
        `https://api.rawg.io/api/games?key=${API_KEY}&ordering=-metacritic&page=${page}&page_size=40`
      );

      const jogos = response.data.results || [];

      for (const jogo of jogos) {
        const gameData = {
          name: jogo.name,
          slug: createSlug(jogo.name),
          description: "",
          genres: (jogo.genres || []).map((g) => g.name),
          platforms: (jogo.platforms || []).map((p) => p.platform.name),
          image_url: jogo.background_image || "",
          screenshots: [],
          release_date: jogo.released ? new Date(jogo.released) : null,
          release_year: jogo.released ? new Date(jogo.released).getFullYear() : null,
          developer: "",
          publisher: "",
          rating: jogo.rating,
          rating_count: jogo.ratings_count,
          metacritic: jogo.metacritic,
          tags: (jogo.tags || []).map((t) => t.name),
          modes: [],
          price: null,
          is_free: false,
          external_id: `rawg_${jogo.id}`,
          created_at: new Date(),
          updated_at: new Date()
        };

        const result = await games.updateOne(
          { external_id: gameData.external_id },
          { $setOnInsert: gameData },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          totalInseridos++;
          console.log(`Inserido: ${jogo.name}`);
        } else {
          console.log(`Ja existe: ${jogo.name}`);
        }
      }
    }

    console.log(`Total inserido: ${totalInseridos}`);
  } catch (err) {
    console.error("Erro:", err.message);
    process.exitCode = 1;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

seedGames();
