#!/bin/bash
# Создаёт отдельную read-only роль для postgres_exporter (принцип наименьших привилегий).
# Запускается postgres-образом один раз при инициализации пустого тома данных.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'tutor_monitoring') THEN
            CREATE ROLE tutor_monitoring LOGIN PASSWORD '${POSTGRES_EXPORTER_PASSWORD}';
        END IF;
    END
    \$\$;

    -- pg_monitor даёт доступ к pg_stat_* и прочей статистике без прав на данные
    GRANT pg_monitor TO tutor_monitoring;
EOSQL
