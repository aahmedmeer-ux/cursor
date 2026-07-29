import { parseDateTimeString } from '../../../papathemes/sale-countdown';

describe('parseDateTimeString', () => {
    // Test cases for ISO date-time formats
    test('parses full ISO date-time with milliseconds and timezone offset', () => {
        expect(parseDateTimeString('2000-10-31T01:30:00.000-05:00')).toEqual({
            year: 2000,
            month: 10,
            day: 31,
            hour: 1,
            minute: 30,
            second: 0,
            timezone: -5,
        });
    });

    test('parses ISO date-time with space separator and timezone offset', () => {
        expect(parseDateTimeString('2000-10-31 01:30:00 -05:00')).toEqual({
            year: 2000,
            month: 10,
            day: 31,
            hour: 1,
            minute: 30,
            second: 0,
            timezone: -5,
        });
    });

    test('parses ISO date-time with space separator and timezone hour offset only', () => {
        expect(parseDateTimeString('2000-10-31 01:30:00 -05')).toEqual({
            year: 2000,
            month: 10,
            day: 31,
            hour: 1,
            minute: 30,
            second: 0,
            timezone: -5,
        });
    });

    test('parses ISO date-time with positive timezone hour offset', () => {
        expect(parseDateTimeString('2000-10-31 01:30:00 +5')).toEqual({
            year: 2000,
            month: 10,
            day: 31,
            hour: 1,
            minute: 30,
            second: 0,
            timezone: 5,
        });
    });

    test('parses ISO date-time with positive timezone hour and minute offset', () => {
        expect(parseDateTimeString('2000-10-31 01:30:00 +5:30')).toEqual({
            year: 2000,
            month: 10,
            day: 31,
            hour: 1,
            minute: 30,
            second: 0,
            timezone: 5.5,
        });
    });

    test('parses month-day with time and positive timezone offset', () => {
        expect(parseDateTimeString('10-31 30:00 +5:30')).toEqual({
            month: 10,
            day: 31,
            hour: 30,
            minute: 0,
            timezone: 5.5,
        });
    });

    test('parses time with positive timezone offset', () => {
        expect(parseDateTimeString('30:00 +5:30')).toEqual({
            hour: 30,
            minute: 0,
            timezone: 5.5,
        });
    });

    test('parses time without timezone', () => {
        expect(parseDateTimeString('30:00')).toEqual({
            hour: 30,
            minute: 0,
        });
    });

    test('parses single time component', () => {
        expect(parseDateTimeString('30')).toEqual({
            hour: 30,
        });
    });

    // Additional test cases to ensure previous functionality is intact
    test('parses date-only ISO format', () => {
        expect(parseDateTimeString('2000-10-31')).toEqual({
            year: 2000,
            month: 10,
            day: 31,
        });
    });

    test('parses time-only with seconds and timezone', () => {
        expect(parseDateTimeString('01:30:00Z')).toEqual({
            hour: 1,
            minute: 30,
            second: 0,
            timezone: 0,
        });
    });

    test('parses time-only with seconds and positive timezone offset', () => {
        expect(parseDateTimeString('01:30:00+02:00')).toEqual({
            hour: 1,
            minute: 30,
            second: 0,
            timezone: 2,
        });
    });

    test('parses time-only with seconds and negative timezone offset', () => {
        expect(parseDateTimeString('01:30:00-02:30')).toEqual({
            hour: 1,
            minute: 30,
            second: 0,
            timezone: -2.5,
        });
    });

    test('parses date-time with "T" separator and UTC timezone', () => {
        expect(parseDateTimeString('2000-10-31T01:30:00Z')).toEqual({
            year: 2000,
            month: 10,
            day: 31,
            hour: 1,
            minute: 30,
            second: 0,
            timezone: 0,
        });
    });

    test('parses date and time with milliseconds', () => {
        expect(parseDateTimeString('2000-10-31T01:30:00.123')).toEqual({
            year: 2000,
            month: 10,
            day: 31,
            hour: 1,
            minute: 30,
            second: 0,
        });
    });

    test('parses invalid format', () => {
        expect(parseDateTimeString('Invalid String')).toBeNull();
    });
});
