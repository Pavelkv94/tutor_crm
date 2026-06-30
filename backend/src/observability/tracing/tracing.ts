import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { env } from "@/config/bootstrap-env";
import { OBSERVABILITY_DEFAULTS } from "@/observability/observability.constants";

//* opentelemetry должен загружаться до инициализации nestjs модулей, поэтому импортируем этот файл первым в main.ts.
//* Здесь нельзя импортировать Nest-модули (@nestjs/*), иначе они загрузятся до старта SDK и не будут инструментированы.
//* bootstrap-env безопасен — он не тянет за собой @nestjs/core.

const serviceName = env.OTEL_SERVICE_NAME ?? OBSERVABILITY_DEFAULTS.serviceName;
const exporterUrl =
    env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? OBSERVABILITY_DEFAULTS.tracesEndpoint;

const traceExporter = new OTLPTraceExporter({
    url: exporterUrl,
});

const sdk = new NodeSDK({
    traceExporter,
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: serviceName,
    }),
    instrumentations: [
        //* getNodeAutoInstrumentations включает все инструментации по умолчанию,
        //* поэтому здесь только отключаем шумные/ненужные для этого сервиса
        getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': {
                enabled: false,
            },
            '@opentelemetry/instrumentation-dns': {
                enabled: false,
            },
            '@opentelemetry/instrumentation-net': {
                enabled: false,
            },
            '@opentelemetry/instrumentation-grpc': {
                enabled: false,
            },
        }),
    ],
});

sdk.start();

//* graceful shutdown — даём SDK дослать оставшиеся спаны перед остановкой процесса
const shutdown = () => {
    sdk
        .shutdown()
        .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
        .finally(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
