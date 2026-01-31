import { http } from "@ampt/sdk";
import { createRequestHandler } from "@react-router/express";
import express from "express";

const app = express();

// Serve static assets from the client build
app.use(express.static("build/client", { maxAge: "1h" }));

// Handle all other requests with React Router
app.all(
  "*",
  createRequestHandler({
    // `build` will be the path to the server build output
    build: () => import("./build/server/index.js"),
  })
);

http.node.use(app);
