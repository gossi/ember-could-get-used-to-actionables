import { getOwner, setOwner } from '@ember/application';
import { assert } from '@ember/debug';

import { Commandable, Invocable } from 'ember-command/-private/commandables';
import { UILink } from 'ember-link';
import LinkManagerService from 'ember-link/services/link-manager';

import { Command } from './-private/command';
import { LinkCommand } from './-private/link-command';

export { Command, LinkCommand };

type InvocableCommandable = Command | Invocable;

export interface CommandAction {
  (...args: unknown[]): void;
  link?: UILink;
}

export function makeAction(
  owner: unknown,
  composition: Commandable | Commandable[]
): CommandAction {
  const commandables = !Array.isArray(composition)
    ? [composition]
    : composition;

  // find the (first) link
  const link = commandables.find(
    commandable =>
      commandable instanceof UILink || commandable instanceof LinkCommand
  ) as unknown as UILink | LinkCommand;

  // keep remaining invocables
  const invocables = commandables.filter(
    commandable =>
      commandable instanceof Command || typeof commandable === 'function'
  ) as InvocableCommandable[];

  // set owner to commands
  invocables.map(commandable => {
    if (commandable instanceof Command) {
      setOwner(commandable, owner);
    }

    return commandable;
  });

  const action = (...args: unknown[]) => {
    for (const fn of invocables) {
      if (fn instanceof Command) {
        fn.execute(...args);
      } else {
        fn(...args);
      }
    }
  };

  if (link instanceof LinkCommand) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const linkManager = owner.lookup(
      'service:link-manager'
    ) as LinkManagerService;
    assert(`missing 'service:link-manager' for 'LinkCommand'`, linkManager);
    action.link = linkManager.createUILink(link.params) as UILink;
  } else if (link instanceof UILink) {
    action.link = link;
  }

  return action;
}

function isCommandable(commandable: unknown) {
  return (
    typeof commandable === 'function' ||
    commandable instanceof Command ||
    commandable instanceof LinkCommand ||
    commandable instanceof UILink
  );
}

export function commandFor(commandAction: unknown | unknown[]): CommandAction {
  assert(
    `${commandAction} do not appear to be a command`,
    commandAction && Array.isArray(commandAction)
      ? commandAction.every(commandable => isCommandable(commandable))
      : isCommandable(commandAction)
  );

  return commandAction as unknown as CommandAction;
}

interface DecoratorPropertyDescriptor extends PropertyDescriptor {
  initializer?(): unknown;
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore typings are weird for that case. That's the best to make it work
// as expression - ie. ignoring was easier than to change the code to a factory 😱
const command: PropertyDecorator = function (
  _prototype: unknown,
  key: string | symbol,
  desc: PropertyDescriptor
) {
  const actions = new WeakMap();
  const { initializer } = desc as DecoratorPropertyDescriptor;

  return {
    get() {
      let action = actions.get(this);

      if (!action) {
        assert(
          `Missing initializer for '${String(key)}'.`,
          typeof initializer === 'function'
        );
        action = makeAction(getOwner(this), initializer.call(this));
        actions.set(this, action);
      }

      return action;
    }
  };
};

export { command };
