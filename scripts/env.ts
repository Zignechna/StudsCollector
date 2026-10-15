// Loads .env.local (then .env) for standalone scripts. Must be imported first.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
