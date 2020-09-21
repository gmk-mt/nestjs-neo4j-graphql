export default `
    enum Role {
        admin
        user
    }
    
    directive @isUser on OBJECT

    type User @additionalLabels(labels: ["user_<%= $cypherParams.userId %>"]) {
        name: String!
        email: String! @unique
        password: String! @hasRole(roles: [admin])
        role: Role
        products: [Product] @relation(name: "SELLS", direction: "OUT")
    }

    type Product @additionalLabels(labels: ["user_<%= $cypherParams.userId %>"]) {
        productId: ID!
        name: String!
    }

    type Customer @additionalLabels(labels: ["user_<%= $cypherParams.userId %>"]) {
        customerId: ID!
        name: String!
        email: String! @unique

    }

    type Order @additionalLabels(labels: ["user_<%= $cypherParams.userId %>"]) {
        orderId: ID!
 
    }

    type Query {
        login(email: String!, password: String!): String
        adminProducts: [Product]! @hasRole(roles: [admin]) @cypher(statement: """
            MATCH (p:Product) RETURN p
        """)
    }

    type Mutation {
        register(name: String!, email: String!, password: String!): String
        setUserRole(email: String!, role: Role!): User @hasRole(roles: [admin]) @cypher(statement: """
            MATCH (u:User) WHERE u.email = $email SET u.role = $role RETURN u
        """)
    }
`