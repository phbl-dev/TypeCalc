export const jumpToCell = () => {
    const inputID = (document.getElementById(
        "jumpToInput") as HTMLInputElement).value;
    const targetCell = document.getElementById(inputID)
    const headerCorner = document.getElementById("headerCorner");

    if(targetCell && headerCorner) {
        targetCell.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => targetCell.focus(), 100); // Small delay for scrolling
        headerCorner.textContent = inputID;
    }
    else {
        console.log("Target cell not found")
    }
}