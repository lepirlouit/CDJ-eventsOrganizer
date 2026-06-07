import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

export const DocumentClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({}),
  { marshallOptions: { removeUndefinedValues: true } }
);

export const table = Resource.MainTable.name;
