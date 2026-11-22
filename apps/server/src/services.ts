import { createAuth } from "@finance/auth";
import { createDb } from "@finance/db";

import { ENV, desktopOrigins } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db, desktopOrigins);
