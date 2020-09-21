import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { makeAugmentedSchema, assertSchema } from "neo4j-graphql-js"

import driver from "src/db/driver"
import typeDefs from "src/schema.graphql"
import { comparePassword, createUserToken, encryptPassword, getTokenPayload } from "./auth/auth";
import { getRecords } from "./db/utils";
import { IsUserDirective, MyHasRoleDirective } from "src/directives/hasRole.directive"

const resolvers = {
    Query: {
        login: async (obj, params, ctx, resolveInfo) => {
            console.log("ctx", ctx.user)
            const { email, password } = params

            const session = ctx.driver.session()
            const result = await session.run("MATCH (u:User) WHERE u.email = $email RETURN u", { email })

            const users = getRecords(result, 'u')

            if (users.length === 0) {
                throw new Error("User not found")
            }

            const user = users[0]
            if (await comparePassword(password, user.password)) {
                return createUserToken(users[0])
            } else {
                throw new Error("Invalid password")
            }



        },
    },
    Mutation: {

        register: async (obj, params, ctx, resolveInfo) => {
            console.log("register", params)
            const session = ctx.driver.session()

            const encryptedPassword = await encryptPassword(params.password)
            try {
                const user = { ...params, password: encryptedPassword, role: "user" }
                const created = await session.run("CREATE (u:User { name: $name, email: $email, password: $password, role: $role }) WITH u, ('user_' + ID(u)) as id CALL apoc.create.addLabels(u, [id]) YIELD node RETURN u", user)
                console.log('created', getRecords(created, "u"))

                const createdUser = created[0]
                return createUserToken(createdUser)
            } catch (err) {
                throw err
            }

        }
    }

}

console.time("schema")
const schema = makeAugmentedSchema({
    typeDefs,
    resolvers,
    schemaDirectives: {
        hasRole: MyHasRoleDirective,
        isUser: IsUserDirective
    },
    config: {
        auth: {
            isAuthenticated: true,
            hasRole: true
        }
    }
})
console.timeEnd("schema")

console.time("assert")
assertSchema({ schema, driver, debug: true })
console.timeEnd("assert")

console.time("gql module")
@Module({
    imports: [
        GraphQLModule.forRoot({
            schema,
            context: ({ req }) => {
                const authorization = req.headers['authorization']
                let user = null
                let roles = []
                if (authorization) {
                    const token = authorization.split(" ")[1]

                    try {
                        const payload = getTokenPayload(token)
                        user = payload
                        roles = [user.role]

                        console.log("Authenticated", user, roles)
                    } catch (err) {
                        throw new Error("Invalid authorization token")
                    }
                }

                return {
                    driver,
                    user,
                    cypherParams: {
                        userId: user ? user.id : ""
                    }
                }
            }
        })
    ],
})
export class AppModule { }
console.timeEnd("gql module")
