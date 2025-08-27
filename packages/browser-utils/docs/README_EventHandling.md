# Event Handling in Browser Utils


## Define Dom Events with TypeScript

```ts
declare global {
  interface DocumentEventMap {
    "user:created": CustomEvent<{ id: string; email: string }>;
    "order:paid":   CustomEvent<{ id: string; amount: number }>;
  }
}
```


## Listen to events


Listen to single event
```ts
import { Listen } from './EventBindingsMixin';

class SomeElement extends EventBindingsMixin(HTMLElement) {

    @Listen("ussr:created", { target: 'document' })
    protected onWindowResize (event: DocumentEventMap["user:created"]) {
        console.log('Window resized', event);
    };

}
```

or multiple events
```ts
import { Listen } from './EventBindingsMixin';
class SomeElement extends EventBindingsMixin(HTMLElement) {

    @Listen(["user:created", "order:paid"], { target: 'document' })
    protected onUserCreatedOrOrderPaid (event: DocumentEventMap["user:created"] | DocumentEventMap["order:paid"]) {
        console.log('User created or order paid', event);
    };

}
```