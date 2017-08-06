"use strict";

const argv = require("yargs").argv;
const path = require("path");

const { Workflow } = require("megaminx");

const main = async function() {
	const recipePath = path.resolve(argv.recipe);
	const recipe = require(recipePath);
	const config = {};
	const flow = new Workflow(config);
	await flow.run(recipe, config, argv);
};

main().catch(console.log);
