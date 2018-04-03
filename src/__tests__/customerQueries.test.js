/* eslint-env jest */

import faker from 'faker';
import { Customers, Segments, Tags } from '../db/models';
import { graphqlRequest, connect, disconnect } from '../db/connection';
import { customerFactory, tagsFactory, segmentFactory } from '../db/factories';

beforeAll(() => connect());

afterAll(() => disconnect());

const count = response => {
  return Object.keys(response).length;
};

describe('customerQueries', () => {
  const commonParamDefs = `
    $page: Int,
    $perPage: Int,
    $segment: String,
    $tag: String,
    $ids: [String],
    $searchValue: String
  `;

  const commonParams = `
    page: $page
    perPage: $perPage
    segment: $segment
    tag: $tag
    ids: $ids
    searchValue: $searchValue
  `;

  const qryCustomers = `
    query customers(${commonParamDefs}) {
      customers(${commonParams}) {
        _id
        firstName
        lastName
        email
        phone
        tagIds
      }
    }
  `;

  const qryCustomersMain = `
    query customersMain(${commonParamDefs}) {
      customersMain(${commonParams}) {
        list {
          _id
          firstName
          lastName
          email
          phone
          tagIds
        }
        totalCount
      }
    }
  `;

  const qryCount = `
    query customerCounts(${commonParamDefs} $byFakeSegment: JSON) {
      customerCounts(${commonParams} byFakeSegment: $byFakeSegment)
    }
  `;

  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  const email = faker.internet.email();
  const phone = '12345678';

  afterEach(async () => {
    // Clearing test data
    await Customers.remove({});
    await Segments.remove({});
    await Tags.remove({});
  });

  test('Customers', async () => {
    await customerFactory();
    await customerFactory();
    await customerFactory();
    await customerFactory();

    const args = { page: 1, perPage: 3 };
    const responses = await graphqlRequest(qryCustomers, 'customers', args);

    expect(responses.length).toBe(3);
  });

  test('Customers filtered by ids', async () => {
    const customer1 = await customerFactory();
    const customer2 = await customerFactory();
    const customer3 = await customerFactory();

    await customerFactory();

    const ids = [customer1._id, customer2._id, customer3._id];

    const responses = await graphqlRequest(qryCustomers, 'customers', { ids });

    expect(responses.length).toBe(3);
  });

  test('Customers filtered by tag', async () => {
    const tag = await tagsFactory();

    await customerFactory();
    await customerFactory();
    await customerFactory({ tagIds: tag._id });
    await customerFactory({ tagIds: tag._id });

    const tagResponse = await Tags.findOne({}, '_id');

    const responses = await graphqlRequest(qryCustomers, 'customers', { tag: tagResponse._id });

    expect(responses.length).toBe(2);
  });

  test('Customers filtered by segment', async () => {
    await customerFactory({ firstName });

    const args = {
      contentType: 'customer',
      conditions: {
        field: 'firstName',
        operator: 'c',
        value: firstName,
        type: 'string',
      },
    };

    const segment = await segmentFactory(args);

    const response = await graphqlRequest(qryCustomers, 'customers', { segment: segment._id });

    expect(response.length).toBe(1);
  });

  test('Customers filtered by search value', async () => {
    await customerFactory({ firstName });
    await customerFactory({ lastName });
    await customerFactory({ phone });
    await customerFactory({ email });

    // customers by firstName ==============
    let responses = await graphqlRequest(qryCustomers, 'customers', { searchValue: firstName });

    expect(responses.length).toBe(1);
    expect(responses[0].firstName).toBe(firstName);

    // customers by lastName ===========
    responses = await graphqlRequest(qryCustomers, 'customers', { searchValue: lastName });

    expect(responses.length).toBe(1);
    expect(responses[0].lastName).toBe(lastName);

    // customers by email ==========
    responses = await graphqlRequest(qryCustomers, 'customers', { searchValue: email });

    expect(responses.length).toBe(1);
    expect(responses[0].email).toBe(email);

    // customers by phone ==============
    responses = await graphqlRequest(qryCustomers, 'customers', { searchValue: phone });

    expect(responses.length).toBe(1);
    expect(responses[0].phone).toBe(phone);
  });

  test('Main customers', async () => {
    await customerFactory();
    await customerFactory();
    await customerFactory();
    await customerFactory();

    const args = { page: 1, perPage: 3 };
    const responses = await graphqlRequest(qryCustomersMain, 'customersMain', args);

    expect(responses.list.length).toBe(3);
    expect(responses.totalCount).toBe(4);
  });

  test('Main customers filtered by ids', async () => {
    const customer1 = await customerFactory();
    const customer2 = await customerFactory();
    const customer3 = await customerFactory();

    await customerFactory();

    const ids = [customer1._id, customer2._id, customer3._id];

    const responses = await graphqlRequest(qryCustomersMain, 'customersMain', { ids });

    expect(responses.list.length).toBe(3);
    expect(responses.totalCount).toBe(3);
  });

  test('Main customers filtered by tag', async () => {
    const tag = await tagsFactory();

    await customerFactory();
    await customerFactory();
    await customerFactory({ tagIds: tag._id });
    await customerFactory({ tagIds: tag._id });

    const tagResponse = await Tags.findOne({}, '_id');

    const responses = await graphqlRequest(qryCustomersMain, 'customersMain', {
      tag: tagResponse._id,
    });

    expect(responses.list.length).toBe(2);
    expect(responses.totalCount).toBe(2);
  });

  test('Main customers filtered by segment', async () => {
    await customerFactory({ firstName });

    const args = {
      contentType: 'customer',
      conditions: {
        field: 'firstName',
        operator: 'c',
        value: firstName,
        type: 'string',
      },
    };

    const segment = await segmentFactory(args);

    const response = await graphqlRequest(qryCustomersMain, 'customersMain', {
      segment: segment._id,
    });

    expect(response.list.length).toBe(1);
    expect(response.totalCount).toBe(1);
  });

  test('Main customers filtered by search value', async () => {
    await customerFactory({ firstName });

    // customers by firstName =============
    const responses = await graphqlRequest(qryCustomersMain, 'customersMain', {
      searchValue: firstName,
    });

    expect(responses.list.length).toBe(1);
    expect(responses.totalCount).toBe(1);
  });

  test('Count customers', async () => {
    await customerFactory();
    await customerFactory();

    // Creating test data
    await segmentFactory({ contentType: 'customer' });
    await tagsFactory({ type: 'customer' });

    let response = await graphqlRequest(qryCount, 'customerCounts');

    expect(count(response.bySegment)).toBe(1);
    expect(count(response.byTag)).toBe(1);
  });

  test('Customer count by tag', async () => {
    await customerFactory();
    await customerFactory();

    await tagsFactory({ type: 'company' });
    await tagsFactory({ type: 'customer' });

    const response = await graphqlRequest(qryCount, 'customerCounts');

    expect(count(response.byTag)).toBe(1);
  });

  test('Customer count by segment', async () => {
    await customerFactory();
    await customerFactory();

    await segmentFactory({ contentType: 'customer' });
    await segmentFactory({ contentType: 'company' });

    const response = await graphqlRequest(qryCount, 'customerCounts');

    expect(count(response.bySegment)).toBe(1);
  });

  test('Customer count by fake segment', async () => {
    await customerFactory({ lastName });

    const byFakeSegment = {
      contentType: 'customer',
      conditions: [
        {
          field: 'lastName',
          operator: 'c',
          value: lastName,
          type: 'string',
        },
      ],
    };

    const response = await graphqlRequest(qryCount, 'customerCounts', { byFakeSegment });

    expect(response.byFakeSegment).toBe(1);
  });

  test('Customer detail', async () => {
    const customer = await customerFactory();

    const qry = `
      query customerDetail($_id: String!) {
        customerDetail(_id: $_id) {
          _id
        }
      }
    `;

    const response = await graphqlRequest(qry, 'customerDetail', { _id: customer._id });

    expect(response._id).toBe(customer._id);
  });
});
