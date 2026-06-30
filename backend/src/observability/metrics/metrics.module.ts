import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { makeCounterProvider, makeGaugeProvider, makeHistogramProvider, PrometheusModule } from '@willsoto/nestjs-prometheus';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

@Global()
@Module({
    imports: [
        PrometheusModule.register({
            path: '/metrics',
            defaultMetrics: {
                enabled: true
            },
        }),
    ],
    providers: [
        makeHistogramProvider({
            name: 'http_requests_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['service', 'method', 'route', 'status'],
            buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        }),
        makeGaugeProvider({
            name: 'http_requests_in_progress',
            help: 'Number of HTTP requests in progress',
            labelNames: ['service', 'method', 'route'],
        }),
        makeCounterProvider({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['service', 'method', 'route', 'status'],
        }),
        HttpMetricsInterceptor,
        {
            provide: APP_INTERCEPTOR,
            useClass: HttpMetricsInterceptor,
        }
    ],
    exports: [],
})
export class MetricsModule { }