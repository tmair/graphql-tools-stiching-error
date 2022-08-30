import { ApolloServer } from "apollo-server";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";

import {
  delegateToSchema,
  defaultMergedResolver,
} from "@graphql-tools/delegate";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { stitchSchemas } from "@graphql-tools/stitch";
import { OperationTypeNode } from "graphql";
import { fetch } from '@whatwg-node/fetch'
import { print } from 'graphql'
import { introspectSchema, wrapSchema } from '@graphql-tools/wrap'

const executor = async ({ document, variables }) => {
  const query = print(document)
  const fetchResult = await fetch('https://swapi-graphql.netlify.app/.netlify/functions/index', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  })
  return fetchResult.json()
}

const getDomainSchema = async () => {
  const schema = wrapSchema({
    schema: await introspectSchema(executor),
    executor
  })
  return schema
}



const startServer = async () => {
  const domainSchema = await getDomainSchema()

  const layer1 = stitchSchemas({
    subschemas: [{ schema: domainSchema }],
    typeDefs: `

    extend type Planet {
      newProp: Film
    }
    `,
    resolvers: {
      Planet: {
        newProp: {
          selectionSet: "{id}",
          async resolve(parent, args, context, info) {
            const result = await delegateToSchema({
              args: { id: "ZmlsbXM6Mw==" },
              context,
              fieldName: "film",
              info,
              operation: OperationTypeNode.QUERY,
              schema: layer1,
            });

            return result;
          },
        },
      },
    },
  });

  const gatewaySchema = stitchSchemas({
    subschemas: [{ schema: layer1 }],
    resolvers: {
      Film: {
        planetConnection: {
          async resolve(parent, args, context, info) {
            return parent[info.path.key];
            return defaultMergedResolver(parent, args, context, info);
          },
        },
      },
    },
  });

  const app = new ApolloServer({
    schema: gatewaySchema,
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
    debug: true,
    formatError: (err) => {
      console.error(err.originalError);
      return err;
    },
  });

  const { url } = await app.listen({ port: 4000 });

  console.log(`🚀 Server ready at ${url}`);
};

startServer();
