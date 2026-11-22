import { createAuth } from "@wallet/auth";
import { createDb } from "@wallet/db";

import { desktopOrigins, ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db, desktopOrigins);
