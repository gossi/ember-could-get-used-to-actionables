import { action } from '@ember/object';
import Component from '@glimmer/component';

import { UILink } from 'ember-link';

import { Invocable } from '../../-private/commandables';
import { CommandAction } from '../../index';

export type Command = Invocable | UILink | CommandAction;

interface CommandElementArgs {
  command: Command;
  /**
   * Pass in a `(element)` as fallback when `@command` is empty. Anyway a `<span>`
   * is used.
   */
  element?: Component;
}

export default class CommandElementComponent extends Component<CommandElementArgs> {
  get tagName(): 'a' | 'button' | undefined {
    if (this.link) {
      return 'a';
    }

    if (this.command) {
      return 'button';
    }

    // eslint-disable-next-line unicorn/no-useless-undefined
    return undefined;
  }

  get command(): Invocable | undefined {
    if (typeof this.args.command === 'function') {
      return this.args.command;
    }

    // eslint-disable-next-line unicorn/no-useless-undefined
    return undefined;
  }

  get link(): UILink | undefined {
    if (this.args.command instanceof UILink) {
      return this.args.command;
    }

    return (this.args.command as CommandAction)?.link;
  }

  @action
  invoke(event: Event): void {
    if (typeof this.args.command === 'function') {
      this.args.command();
    }

    if (this.link) {
      this.link.transitionTo(event);
    }
  }
}