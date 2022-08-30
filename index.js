import { ApolloServer } from "apollo-server";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { delegateToSchema } from "@graphql-tools/delegate";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { stitchSchemas } from "@graphql-tools/stitch";
import { OperationTypeNode } from "graphql";

const startServer = async () => {
  const domainSchema = makeExecutableSchema({
    typeDefs: `
      type Domain {
        id: ID!
        name: String!
      }
      type Query {
        domains(ids: [ID!]!): [Domain!]!
      }
    `,
    resolvers: {
      Query: {
        domains: (_, { ids }) =>
          ids.map((id) => ({ id: Number(id), name: `domain${id}` })),
      },
    },
  });

  const gatewaySchema = stitchSchemas({
    subschemas: [{ schema: domainSchema }],
    typeDefs: `

    extend type Domain {
      newProp: Domain
    }
    `,
    resolvers: {
      Domain: {
        newProp: {
          selectionSet: "{id}",
          async resolve(parent, args, context, info) {
            const result = await delegateToSchema({
              args: { ids: [42] },
              context,
              fieldName: "domains",
              info,
              operation: OperationTypeNode.QUERY,
              schema: gatewaySchema,
            });

            return result;
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
