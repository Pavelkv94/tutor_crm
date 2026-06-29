import { plainToInstance } from "class-transformer";
import { EnvSchema } from "./env.schema";
import { validateSync } from "class-validator";

export function validateEnv(env: Record<string, any>) {

  const validated = plainToInstance(EnvSchema, env, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      '❌ Invalid environment variables:\n' +
        errors.map((e) => e.toString()).join('\n'),
    );
  }

  return validated;
}