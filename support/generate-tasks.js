const fs = require("fs");
const path = require("path");
const stream = require("stream");
const argv = require("yargs").argv;
const sg = require("./stylegroups");

function pathjoin() {
	return path.join.apply(path, arguments).replace(/\\/g, "/");
}

let jHint = Math.max(15, argv.jh - 0 || 15);

const config = JSON.parse(fs.readFileSync(argv.config, "utf-8"));
if (!config || !config.settings || !config.fonts) {
	console.log("Bad config.fonts.");
	process.exit(1);
}

let stylegroups = sg.stylegroupsOf(config);
sg.initParamfiles(stylegroups, config);

const tempdir = argv.tempdir || "build";
const outdir = argv.outdir || "out";

function unifiedHGFFileOf(style) {
	return pathjoin(tempdir, style + ".hgf");
}
function unifiedHGIFileOf(style) {
	return pathjoin(tempdir, style + ".hgi");
}

function capitalize(str) {
	return str.replace(/\w\S*/g, function(txt) {
		return txt.charAt(0).toUpperCase() + txt.slice(1);
	});
}

let intermediates = [];
let phonies = [];
let hgls = [];
let targets = [];

const doTTFAutohint = config.settings.do_ttfautohint;

function groupIDof(groupid, k, group) {
	return group.gid;
}
function styleNameOf(groupid, k, group) {
	return group.gid;
}

let mk = Object.keys(stylegroups).map(function(groupid, k) {
	let buf = "";
	const group = stylegroups[groupid];
	const groupNameBase = groupIDof(groupid, k, group);
	const hgifile = pathjoin(tempdir, groupNameBase + ".g.hgi");

	const paramFile = group.param;
	const PARAM = "--parameters " + paramFile + " $(PARAM_CVT)";

	const ttcParts = [];

	for (let style of group.fonts) {
		const fileNameBase = path.parse(style.input).name;
		const inotd = pathjoin(tempdir, fileNameBase + ".in.otd");
		const outotd = pathjoin(tempdir, fileNameBase + ".out.otd");
		const target = pathjoin(tempdir, fileNameBase + ".ttf");

		buf += `${outotd} : ${hgifile} ${inotd} ${paramFile} $(CVTFILE)
	$(APPLYHGI) ${hgifile} ${inotd} -o $@ ${PARAM} ${argv.usevttshell ? " --padvtt" : ""}
`;
		if (argv.usevttshell) {
			const tmpttf = pathjoin(tempdir, fileNameBase + ".tmp.ttf");
			buf += tmpttf + " : " + outotd + "\n" + "\t$(OTFCCBUILD) $^ -o $@\n";
			buf += `${target} : ${tmpttf}\n` + `\t$(VTTSHELL) -q -a $< $@\n`;
		} else {
			buf += target + " : " + outotd + "\n" + "\t$(OTFCCBUILD) $^ -o $@\n";
		}
		if (argv.buildttc) {
			ttcParts.push(target);
		} else {
			const finalTarget = pathjoin(outdir, fileNameBase + ".ttf");
			buf += finalTarget + " : " + target + "\n" + "\t$(COPY) $^ $@\n";
			targets.push(finalTarget);
		}
		intermediates.push(outotd);
	}
	if (ttcParts.length) {
		const ttcName = pathjoin(outdir, path.parse(groupid).name + ".ttc");
		buf += `${ttcName} : ${ttcParts.join(" ")}
	$(TTCIZE) -o $@ -h -k $^`;
		targets.push(ttcName);
	}
	return buf;
});

mk = mk.concat(
	Object.keys(stylegroups).map(function(groupid, k) {
		let buf = "";
		let group = stylegroups[groupid];
		let groupNameBase = groupIDof(groupid, k, group);

		let hglparts = [];
		let hgl = pathjoin(tempdir, groupNameBase + ".g.hgl");
		let target = pathjoin(tempdir, groupNameBase + ".g.hgi");

		let paramFile = group.param;
		let PARAM = "--parameters " + paramFile + " $(PARAM_CVT)";

		for (let style of group.fonts) {
			let { name: fileNameBase, ext: fileNameExt } = path.parse(style.input);
			let source = pathjoin(style.input);
			let inotd = pathjoin(tempdir, fileNameBase + ".in.otd");
			let inhgl = pathjoin(tempdir, fileNameBase + ".in.hgl");

			if (fileNameExt !== ".ttf") {
				let in0otd = pathjoin(tempdir, fileNameBase + ".in0.otd");
				let in1otd = pathjoin(tempdir, fileNameBase + ".in1.otd");
				let in1ttf = pathjoin(tempdir, fileNameBase + ".in1.ttf");

				buf += `
${in0otd} : ${source}
	$(OTFCCDUMP) $< -o $@
${in1otd} : ${in0otd}
	$(NODE) support/megaminx-simple --recipe support/megaminx-quadify-gc $< -o $@
${in1ttf} : ${in1otd}
	$(OTFCCBUILD) $< -o $@
`;
				source = in1ttf;
			}
			if (doTTFAutohint) {
				let latinhinted = pathjoin(tempdir, fileNameBase + ".tah.ttf");
				buf +=
					latinhinted +
					" : " +
					source +
					" $(TTFAUTOHINT_PARAM_FILE)\n" +
					"\t$(TTFAUTOHINT) $< $@\n";
				buf += inotd + " : " + latinhinted + "\n" + "\t$(OTFCCDUMP) $< -o $@\n";
			} else {
				buf += inotd + " : " + source + "\n" + "\t$(OTFCCDUMP) $< -o $@\n";
			}

			buf += inhgl + " : " + inotd + "\n" + "\t$(OTD2HGL) $< -o $@ --ideo-only\n";
			hglparts.push(inhgl);
		}

		buf += hgl + " : " + hglparts.join(" ") + "\n" + "\t$(MERGE) -o $@ $^\n";
		hgls.push(hgl);

		let hgiParts = [];

		for (let j = 0; j < jHint; j++) {
			let hgipart = pathjoin(tempdir, groupNameBase + "-" + j + ".hgi");

			buf += `${hgipart} : ${hgl} ${paramFile}
	$(HINTHGL) $< -o $@ ${PARAM} -d ${jHint} -m ${j}
`;
			hgiParts.push(hgipart);
		}

		buf += target + " : " + hgiParts.join(" ") + "\n" + "\t$(MERGE) $^ -o $@\n";

		buf +=
			"visual-" +
			styleNameOf(groupid, k, group) +
			" : " +
			hgl +
			"\n" +
			"\t$(PARAMADJ) $< " +
			PARAM +
			" -w $(TESTWORD)\n";

		return buf;
	})
);

mk = mk.concat([
	"__measure-cvt : " +
		config.fonts
			.map(function(style, k) {
				let fileNameBase = path.parse(style.input).name;
				return pathjoin(tempdir, fileNameBase + ".in.otd");
			})
			.join(" ") +
		"\n\t$(NODE) support/measure-cvt $^"
]);

mk = mk.concat([
	"__measure-cvt-save : " +
		config.fonts
			.map(function(style, k) {
				let fileNameBase = path.parse(style.input).name;
				return pathjoin(tempdir, fileNameBase + ".in.otd");
			})
			.join(" ") +
		"\n\t$(NODE) support/measure-cvt $^ -o $(CVTFILE)"
]);

mk = mk.concat(["__build-all : " + targets.join(" ")]);

mk = mk.concat(["__hgls : " + hgls.join(" ")]);

fs.writeFileSync(argv.o, mk.join("\n\n"));
