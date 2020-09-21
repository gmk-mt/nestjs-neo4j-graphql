const jwt = require("jsonwebtoken")
import { IncomingMessage } from "http";
import { SchemaDirectiveVisitor } from "graphql-tools";
import {
    DirectiveLocation,
    GraphQLDirective,
    GraphQLList,
    GraphQLString
} from "graphql";

const verifyAndDecodeToken = ({ context }) => {
    console.log("decoding token")
    const req =
        context instanceof IncomingMessage
            ? context
            : context.req || context.request;

    if (
        !req ||
        !req.headers ||
        (!req.headers.authorization && !req.headers.Authorization) ||
        (!req && !req.cookies && !req.cookies.token)
    ) {
        throw new Error("No authorization token.");
    }

    const token =
        req.headers.authorization || req.headers.Authorization || req.cookies.token;
    try {
        const id_token = token.replace("Bearer ", "");
        const { JWT_SECRET, JWT_NO_VERIFY } = process.env;

        if (!JWT_SECRET && JWT_NO_VERIFY) {
            return jwt.decode(id_token);
        } else {
            return jwt.verify(id_token, JWT_SECRET, {
                algorithms: ["HS256", "RS256"]
            });
        }
    } catch (err) {
        console.log("failed to decode", process.env.JWT_SECRET)
        if (err.name === "TokenExpiredError") {
            throw new Error("Your token is expired");
        } else {
            throw new Error(
                "You are not authorized for this resource"
            );
        }
    }
};

export class IsUserDirective extends SchemaDirectiveVisitor {
    static getDirectiveDeclaration(directiveName, schema) {
        console.log("directive", directiveName)
        return new GraphQLDirective({
            name: "isUser",
            locations: [DirectiveLocation.OBJECT],
        })
    }

    visitObject(obj) {
        console.log("obj", obj)
        const fields = obj.getFields()

        Object.keys(fields).forEach(fieldName => {
            const field = fields[fieldName]
            const next = field.resolve

            field.resolve = function (result, args, context, info) {
                if (!context.user) {
                    throw new Error("Unauthorized")
                }

                const { id } = context.user
                console.log("current user id", id, result, args, info)
            }
        })
    }
}

export class MyHasRoleDirective extends SchemaDirectiveVisitor {
    static getDirectiveDeclaration(directiveName, schema) {
        return new GraphQLDirective({
            name: "hasRole",
            locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
            args: {
                roles: {
                    type: new GraphQLList(schema.getType("Role")),
                    defaultValue: "reader"
                }
            }
        });
    }

    visitFieldDefinition(field) {
        console.log("hasRole on field")
        const expectedRoles = this.args.roles;
        const next = field.resolve;

        field.resolve = function (result, args, context, info) {
            const decoded = verifyAndDecodeToken({ context });

            const roles = process.env.AUTH_DIRECTIVES_ROLE_KEY
                ? decoded[process.env.AUTH_DIRECTIVES_ROLE_KEY] || []
                : decoded["Roles"] ||
                decoded["roles"] ||
                decoded["Role"] ||
                decoded["role"] ||
                [];

            if (expectedRoles.some(role => roles.indexOf(role) !== -1)) {
                return next(result, args, { ...context, user: decoded }, info);
            }

            throw new Error("You are not authorized for this resource");
        };
    }

    visitObject(obj) {
        console.log("hasRole on obj")
        const fields = obj.getFields();
        const expectedRoles = this.args.roles;

        Object.keys(fields).forEach(fieldName => {
            const field = fields[fieldName];
            const next = field.resolve;
            field.resolve = function (result, args, context, info) {
                const decoded = verifyAndDecodeToken({ context });

                const roles = process.env.AUTH_DIRECTIVES_ROLE_KEY
                    ? decoded[process.env.AUTH_DIRECTIVES_ROLE_KEY] || []
                    : decoded["Roles"] ||
                    decoded["roles"] ||
                    decoded["Role"] ||
                    decoded["role"] ||
                    [];

                if (expectedRoles.some(role => roles.indexOf(role) !== -1)) {
                    return next(result, args, { ...context, user: decoded }, info);
                }
                throw new Error(
                    "You are not authorized for this resource"
                );
            };
        });
    }
}