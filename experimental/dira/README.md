# dira

Dira is a atomic rest api server framework that allows you to create REST APIs with ease.

It is not yet another framework, but a meta-framework that connects to existing frameworks like Express, Fastify, and Hapi, Google Cloud Functions, AWS Lambda, and more.

Features include:

- **Framework Agnostic**: Works with multiple frameworks like Express, Fastify, Hapi
- **Middleware Support**: Easily add middleware to your API
- **Per Request Dependency Injection**: Inject dependencies per request for better modularity
- **Application based Dependency Injection**: Use dependency injection at the application level for better organization
- **Routing**: Define routes and handle requests with ease
- **Error Handling**: Built-in error handling for your API
- **Fully TS 5+ Compatible**: No experimental features, fully compatible with TypeScript 5+
-

## Goals

We need a common framework and server-side structure for our REST APIs without limiting the choice of the underlying framework.

The goal for Dira is to provide a easy-to-use framework that works for 95% of the use cases, while still being flexible
enough to allow for custom implementations.

And it allows shifting from one framework to another without having to rewrite the entire codebase.

The goal is to have no braking changes ever and maintain all major versions throughout the lifetime of all projects
using it but keep updating the connectors to always use the latest features of the underlying frameworks.

## Installation & Setup
