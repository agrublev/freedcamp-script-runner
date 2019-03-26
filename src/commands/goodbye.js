const {Command, flags} = require('@oclif/command');
const {cli} = require('cli-ux');

class GoodbyeCommand extends Command {
  async run() {
    const {flags} = this.parse(GoodbyeCommand);
    const name = flags.name || 'world';
    this.log(`hello ${name} from /root/cli/tmp/examples/example-multi-js/src/commands/goodbye.js`);
    // just prompt for input
    // https://github.com/oclif/cli-ux
    await cli.prompt('What is your name?');

    // mask input after enter is pressed
    await cli.prompt('What is your two-factor token?', {type: 'mask'});

    // mask input on keypress (before enter is pressed)
    await cli.prompt('What is your password?', {type: 'hide'});

    // yes/no confirmation
    await cli.confirm('Continue?');

    // "press any key to continue"
    await cli.anykey()
  }
}

GoodbyeCommand.description = `Describe the command here
...
Extra documentation goes here
`;

GoodbyeCommand.flags = {
  name: flags.string({char: 'n', description: 'name to print'}),
};

module.exports = GoodbyeCommand;
