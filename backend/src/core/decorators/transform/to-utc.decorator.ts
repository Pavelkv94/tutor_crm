import { Transform } from 'class-transformer';
import { DateTime } from 'luxon';

export function ToUTC() {
  return Transform(({ value }) => {
    if (!value || typeof value !== 'string') {
      return value;
    }

    const dt = DateTime.fromISO(value);

    if (!dt.isValid) {
      return value; // пусть class-validator потом ругнётся
    }

    return dt.toUTC().toISO();
  });
}
