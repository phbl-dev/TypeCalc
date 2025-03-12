function test() {
    let tmp: number = 1;

    for (let i = 0; i < 10; i++) {
        tmp += i;
    }
}

test();

function t() {}

function s() {
    this;
}

function weee() {
    const i = 0;
    const j = i;
}
