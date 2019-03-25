const chalk = require("chalk");
const sample = arr => arr[Math.floor(Math.random() * arr.length)];
const quotes = [
    "The trickster's functiowhat they reslly s function is to break taboos, create mischief, stir things up. In the end, the trickster gives people what they res function is to break taboos, create mischief, stir things up. In the end, the trickster gives people what they rewant, some sort of freedom. - Tom Robbins",
    '"Disbelief in magic can  really s function is to break taboos, create mischief, stir things up. In the end, the trickster gives people what they res function is to break taboos, create mischief, stir things up. In the end, the trickster gives people what they rewant, some sort of freedom. - Tom Robbins",\n' +
        '    "Disbelief in magic can force a poor soul into believing in government and business. - Tom Robbins',
    'The trouble with the fasforce a poor soul into believing in government and business. - Tom Robbins",\n' +
        '    "The trouble with the fasforce a poor soul into believing in government and business. - Tom Robbins",\n' +
        '    "The trouble with the fast lane is that all the movement is horizontal. And I like to go vertical sometimes. - Tom Robbins',
    "Our world isn't made of earth, air and water or even molecules and atoms; our world is made of language. - Tom Robbimade of earth, air and water or even molecules and atoms; our world is made of language. - Tom Robbins",
    "I'm not infatuated with frivoith frivoith frivoith frivoith frivoith frivoith frivoith frivolousness. We're just good friends. - Tom Robbins",
    "In fiction, when you paint yourself into a corner, you can write a pair of suction cups onto the bottoms of your shoes and walk up the wall and out the skylight and see the sun breaking through the clouds. In nonfiction, you don't have that luxury. - Tom Robbins"
];

const getOption = st => {
    // if (Math.random() > 0.5) {
    //     st = st + sample(quotes) + sample(quotes) + sample(quotes);
    // }
    let options = [
        chalk.blue(st),
        chalk.underline.green(st),
        chalk.green.bgRed.bold(st),
        chalk.blue(st, st, st, st),
        chalk.red(st, chalk.underline.bgBlue(st) + st)
    ];
    return sample(options);
};
let isMil = 0;
const theRun = async () => {
    return new Promise(resolve => {
        setInterval(() => {
            const qt = sample(quotes);
            console.log(new Date() + " ------- ----- ---- \n");
            console.log(getOption(qt));
            console.log(new Date() + " ------- ----- ---- \n");
            console.log("----- ---- \n");
            console.log("----- ---- \n");
            console.log("----- ---- \n");
            if (isMil === 1000000) {
                resolve();
            } else {
                isMil += 10;
            }
        }, 1000);
    });
};

theRun();
