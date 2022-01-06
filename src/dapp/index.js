
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async () => {



    let result = null;

    let contract = new Contract('localhost', () => {
        let displayWrapper = DOM.elid("display-wrapper");

        let topNav = ["contract", "airline", "passenger", "credits"].map(item => {
            return DOM.elid(item);
        });

        let navItemContainer = ["contract-container", "airline-container", "passenger-container", "credits-container"].map(item => {
            return DOM.elid(item);
        });

        // add click listener for each nav item
        topNav.forEach((navItem, index, arr) => {
            navItem.addEventListener("click", () => {
                arr.forEach((item, idx, array) => {
                    item.classList.remove("active");
                    navItemContainer[idx].style.display = "none";// toggle show/hide container
                });
                navItem.classList.add("active");
                navItemContainer[index].style.display = "block";
                displayWrapper.innerHTML = "";
            });
        });



        // Contract > Check operational status of contract
        DOM.elid("contract").addEventListener("click", async () => {
            contract.isOperational((error, result) => {
                display('Operational Status', 'Check if contract is operational', [{ label: 'Operational Status', error: error, value: result }], 'contract-container');
            });
        });
        DOM.elid("contract").click(); // load first screen


        // For Airlines > Register flights
        DOM.elid("register-flight").addEventListener("click", async () => {
            let airlineAddress = DOM.elid("rf-airline-address").value;
            let flightNo = DOM.elid("rf-flight-no").value;
            let departureFrom = DOM.elid("rf-from").value;
            let arrivalAt = DOM.elid("rf-to").value;
            let departureTime = DOM.elid("rf-datetime").value;
            let timestamp = new Date(departureTime).valueOf() / 1000;

            console.log('details', airlineAddress, flightNo, departureFrom, arrivalAt, timestamp);

            contract.registerFlight(airlineAddress, flightNo, departureFrom, arrivalAt, timestamp, (error, result) => {
                if (error) console.log(error);

                let { key, isRegistered } = result;
                display('Flight Registration', `Flight No: ${flightNo}`, [{ label: 'Is Registered?', error: error, value: isRegistered }], 'airline-container');
            });
        });

        // For Passengers > Buy insurance

        // For Passengers > Submit oracle
        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            console.log('submit oracle');
            let flight = DOM.elid('cfs-flight-no').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp }], 'passenger-container');
            });
        })

        // For Passengers > Check credit balance

        // For Passengers > Withdraw credit balance

    });
})();


function display(title, description, results, container) {
    let containerDiv = DOM.elid(container);
    let displayDiv = containerDiv.getElementsByTagName("div")[2]; // locate display-wrapper
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({ className: 'row' }));
        row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
        row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);
    displayDiv.style.display = 'block';

}