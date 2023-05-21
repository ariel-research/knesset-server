import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import bodyParser from "body-parser";
import generalRoutes from "./routes/general.js";
import databaseRoutes from "./routes/database.js";
import morgan from "morgan";

dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.use("/general", generalRoutes);
app.use("/database", databaseRoutes);

const port = 8080;
app.listen(port, () => {
  console.log(`server is listening http://localhost:${port}`);
});
