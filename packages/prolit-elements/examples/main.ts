import { startDialogExample } from './07-dialogs';
import { mountTodoList } from './01-light-dom-list';
import { mountApiUsers } from './02-api-users';
import { startRouterExample } from './03-router-users';
import { mountEventPanel } from './04-event-bindings';
import { mountTemplateSyntax } from './05-template-syntax';

const target = document.querySelector<HTMLElement>('#app')!;
switch (location.pathname.startsWith('/examples/dialogs') ? '07' : new URLSearchParams(location.search).get('example')) {
  case '07': startDialogExample(target); break;
  case '02': mountApiUsers(target); break;
  case '03': startRouterExample(target); break;
  case '04': mountEventPanel(target); break;
  case '05': mountTemplateSyntax(target); break;
  default: mountTodoList(target);
}
