import { DemoType } from '@shared/types';
import { Controller, Req } from '../../../../src';

@Controller({ base: '/:subscriptionId', name: 'base' })
export class BaseCtrlCtrl {
  async index(req: Req, res: Response) {
    const user: DemoType = null;
  }
}

const API = {
  base: (i): void => {
    return {} as any;
  },
};
