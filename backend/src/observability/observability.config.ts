import { registerAs, ConfigType } from '@nestjs/config';
import { env } from '@/config/bootstrap-env';
import { OBSERVABILITY_DEFAULTS } from './observability.constants';

export const observabilityConfig = registerAs('observability', () => ({
  serviceName: env.OTEL_SERVICE_NAME ?? OBSERVABILITY_DEFAULTS.serviceName,
  tracesEndpoint:
    env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? OBSERVABILITY_DEFAULTS.tracesEndpoint,
}));

export type ObservabilityConfig = ConfigType<typeof observabilityConfig>;
