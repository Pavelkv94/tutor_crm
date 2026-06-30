//* Дефолты observability вынесены в отдельный файл без Nest-импортов,
//* чтобы их можно было использовать в tracing.ts (грузится до инициализации Nest)
//* и в observability.config.ts без дублирования значений.
export const OBSERVABILITY_DEFAULTS = {
    serviceName: 'tutor_backend',
    tracesEndpoint: 'http://tutor_jaeger:4318/v1/traces',
} as const;
