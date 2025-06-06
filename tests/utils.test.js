global.window = {};
require('../utils.js');

const { extractNumber, DataUtils } = window.AppUtils;

test('extractNumber handles comma decimal', () => {
    expect(extractNumber('1,23')).toBeCloseTo(1.23);
});

test('generateCustomerKey returns consistent key', () => {
    const customer = { 'Customer Name': 'Acme', LCSM: 'John', ARR: '123' };
    const key = DataUtils.generateCustomerKey(customer);
    expect(key).toBe('Acme|John|123.00');
});
