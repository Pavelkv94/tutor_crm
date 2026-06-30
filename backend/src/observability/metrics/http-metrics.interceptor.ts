import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter, Gauge, Histogram } from "prom-client";
import type { Observable } from "rxjs";
import type { Request, Response } from "express";
import { finalize } from "rxjs";
import { ConfigType } from "@nestjs/config";
import { observabilityConfig } from "@/observability/observability.config";

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
    private readonly SERVICE_NAME: string;
    constructor(
        @InjectMetric('http_requests_total') private readonly counter: Counter<string>,
        @InjectMetric('http_requests_in_progress') private readonly gauge: Gauge<string>,
        @InjectMetric('http_requests_duration_seconds') private readonly histogram: Histogram<string>,
        @Inject(observabilityConfig.KEY) observability: ConfigType<typeof observabilityConfig>,
    ) {
        this.SERVICE_NAME = observability.serviceName;
    }

    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
        // достаем request и response из контекста
        const req = context.switchToHttp().getRequest<Request>();
        const res = context.switchToHttp().getResponse<Response>();
        // достаем метод из request
        const { method } = req;
        // достаем route из request (req.route undefined для несовпавших роутов, напр. 404)
        const route = req.route?.path ?? 'unknown';

        // увеличиваем gauge
        this.gauge.inc({ service: this.SERVICE_NAME });

        // запускаем таймер для измерения длительности запроса
        const endTimer = this.histogram.startTimer();

        return next.handle().pipe(
            finalize(() => {
                // достаем статус из response
                const status = res.statusCode.toString();

                // увеличиваем counter
                this.counter.inc({ service: this.SERVICE_NAME, method, route, status });
                // останавливаем таймер и записываем результат в histogram
                endTimer({
                    service: this.SERVICE_NAME,
                    method,
                    route,
                    status,
                });
                // уменьшаем gauge
                this.gauge.dec({ service: this.SERVICE_NAME });
            }),
        );
    }
}