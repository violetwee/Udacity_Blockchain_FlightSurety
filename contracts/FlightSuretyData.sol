pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private authorizedContracts;
    uint8 private constant PAYOUT_PERCENTAGE = 150;

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    struct Airline {
        bool isRegistered;
        bool isFunded;
        uint256 funds;
    }
    mapping(address => Airline) private registeredAirlines; // track registered airlines, for multi-sig and airline ante
    uint256 public totalRegisteredAirlines = 0;

    // Insurance from passengers
    struct Insurance {
        address passenger;
        uint256 insuranceCost;
        uint256 payoutPercentage;
        bool isPayoutCredited;
    }
    // mapping(bytes32 => Insurance[]) public flightKeyInsurance;
    mapping(bytes32 => Insurance) public passengerInsurance; // (encoded passenger+flightKey => Insurance)

    mapping(address => uint256) public passengerCredits; // passenger => insurance payouts in eth, pending withdrawal

    struct Flight {
        address airline;
        uint8 statusCode;
        uint256 timestamp;
        string flightNo;
        string departureFrom;
        string arrivalAt;
        bool isRegistered;
        address[] insurees;
    }
    mapping(bytes32 => Flight) public flights; // key => Flight
    uint256 public totalRegisteredFlights = 0;

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor(address airlineAddress) public {
        contractOwner = msg.sender;
        registeredAirlines[airlineAddress] = Airline(true, false, 0); // initialise and register first airline
        ++totalRegisteredAirlines;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
     * @dev Modifier that requires the function caller to be an authorized account
     */
    modifier requireIsCallerAuthorized() {
        require(
            authorizedContracts[msg.sender] == 1,
            "Caller is not authorized"
        );
        _;
    }

    /**
     * @dev Modifier that requires the airline to be registered (may not be funded yet)
     */
    modifier requireAirlineIsRegistered(address airlineAddress) {
        require(
            registeredAirlines[airlineAddress].isRegistered == true,
            "Caller is not a registered airline"
        );
        _;
    }

    /**
     * @dev Modifier that requires the ariline to be funded
     */
    modifier requireAirlineIsFunded(address airlineAddress) {
        require(
            registeredAirlines[airlineAddress].isFunded == true,
            "Caller's account is not funded yet"
        );
        _;
    }

    /**
     * @dev Modifier that requires the flight to be registered
     */
    modifier requireRegisteredFlight(bytes32 key) {
        require(
            flights[key].isRegistered == true,
            "Flight is not registered yet"
        );
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) public requireContractOwner {
        operational = mode;
    }

    /**
     * @dev Authorize a contract address (FlightSuretyApp contract)
     */
    function authorizeContract(address contractAddress)
        public
        requireContractOwner
    {
        authorizedContracts[contractAddress] = 1;
    }

    /**
     * @dev Deauthorize a contract address (FlightSuretyApp contract)
     */
    function deauthorizeContract(address contractAddress)
        public
        requireContractOwner
    {
        delete authorizedContracts[contractAddress];
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /*                                    AIRLINE FUNCTIONS                                     */
    /********************************************************************************************/
    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *      Only funded airlines can be
     */
    function registerAirline(address newAirlineAddress)
        external
        requireIsOperational
        requireIsCallerAuthorized
    {
        // Check that airline is not already registered
        require(
            !registeredAirlines[newAirlineAddress].isRegistered,
            "Airline is already registered"
        );

        registeredAirlines[newAirlineAddress] = Airline({
            isRegistered: true,
            isFunded: false,
            funds: 0
        });
        ++totalRegisteredAirlines;
    }

    /**
     * @dev Check an airline's registration status
     *
     */
    function isRegisteredAirline(address airlineAddress)
        external
        view
        requireIsOperational
        returns (bool)
    {
        return registeredAirlines[airlineAddress].isRegistered;
    }

    /**
     * @dev Check an airline's funding status
     *
     */
    function isFundedAirline(address airlineAddress)
        external
        view
        requireIsOperational
        returns (bool)
    {
        return registeredAirlines[airlineAddress].isFunded;
    }

    /**
     * @dev Check an airline's funding amount
     *
     */
    function getFundsForAirline(address airlineAddress)
        external
        view
        requireIsOperational
        returns (uint256)
    {
        return registeredAirlines[airlineAddress].funds;
    }

    /**
     * @dev Get total number of registered airlines
     *
     */
    function getTotalRegisteredAirlines()
        external
        view
        requireIsOperational
        returns (uint256)
    {
        return totalRegisteredAirlines;
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund(address airlineAddress, uint256 amount)
        external
        payable
        requireIsOperational
        returns (bool)
    {
        require(
            registeredAirlines[airlineAddress].isRegistered,
            "Airline is not registered yet"
        );
        registeredAirlines[airlineAddress].isFunded = true;
        registeredAirlines[airlineAddress].funds += amount;

        return registeredAirlines[airlineAddress].isFunded;
    }

    /*                                    PASSENGER FUNCTIONS                                   */
    /********************************************************************************************/
    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy(
        address passenger,
        address airline,
        string flightNo,
        uint256 timestamp,
        uint256 cost
    ) external payable requireIsOperational {
        bytes32 key = getFlightKey(airline, flightNo, timestamp);
        bytes32 insuranceKey = keccak256(abi.encodePacked(passenger, key));

        passengerInsurance[insuranceKey] = Insurance({
            passenger: passenger,
            insuranceCost: cost,
            payoutPercentage: PAYOUT_PERCENTAGE,
            isPayoutCredited: false
        });

        flights[key].insurees.push(passenger);
    }

    function isPassengerInsured(
        address passenger,
        address airline,
        string flightNo,
        uint256 timestamp
    ) external view requireIsOperational returns (bool) {
        bytes32 key = getFlightKey(airline, flightNo, timestamp);
        bytes32 insuranceKey = keccak256(abi.encodePacked(passenger, key));

        return passengerInsurance[insuranceKey].passenger == passenger;
    }

    /**
     *  @dev Credits payouts to insuree
     */
    function creditInsuree(address passenger, bytes32 key)
        internal
        requireIsOperational
    {
        bytes32 insuranceKey = keccak256(abi.encodePacked(passenger, key));

        require(
            passengerInsurance[insuranceKey].passenger == passenger,
            "Passenger does not own insurance for this flight"
        );
        require(
            !passengerInsurance[insuranceKey].isPayoutCredited,
            "Passenger has already been credited"
        );

        // calculate payout
        uint256 amount = passengerInsurance[insuranceKey]
            .insuranceCost
            .mul(passengerInsurance[insuranceKey].payoutPercentage)
            .div(100);

        passengerInsurance[insuranceKey].isPayoutCredited = true;
        passengerCredits[passenger] += amount;
    }

    function getPassengerCredits(address passenger)
        external
        view
        returns (uint256)
    {
        return passengerCredits[passenger];
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay(address passenger) external payable requireIsOperational {
        require(
            passengerCredits[passenger] > 0,
            "Passenger does not have credits to withdraw"
        );

        uint256 credits = passengerCredits[passenger];
        passengerCredits[passenger] = 0;
        passenger.transfer(credits);
    }

    /*                                    FLIGHT FUNCTIONS                                      */
    /********************************************************************************************/

    /**
     *  @dev Register a new flight
     *
     */
    function registerFlight(
        address airline,
        string flightNo,
        string departureFrom,
        string arrivalAt,
        uint256 timestamp
    )
        external
        requireIsOperational
        requireAirlineIsRegistered(airline)
        requireAirlineIsFunded(airline)
        returns (bytes32, bool)
    {
        require(
            !flights[key].isRegistered,
            "Flight has already been registered"
        );

        bytes32 key = getFlightKey(airline, flightNo, timestamp);

        // Flight memory newFlight
        flights[key] = Flight({
            airline: airline,
            statusCode: STATUS_CODE_UNKNOWN,
            timestamp: timestamp,
            flightNo: flightNo,
            departureFrom: departureFrom,
            arrivalAt: arrivalAt,
            isRegistered: true,
            insurees: new address[](0)
        });

        ++totalRegisteredFlights;
        return (key, flights[key].isRegistered);
    }

    function isRegisteredFlight(
        address airline,
        string flightNo,
        uint256 timestamp
    ) external view requireIsOperational returns (bool) {
        bytes32 key = getFlightKey(airline, flightNo, timestamp);

        return flights[key].isRegistered;
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Save flight status info
     *
     */
    function processFlightStatus(
        address airline,
        string flightNo,
        uint256 timestamp,
        uint8 statusCode
    ) external requireIsOperational {
        bytes32 key = getFlightKey(airline, flightNo, timestamp);

        if (flights[key].statusCode == STATUS_CODE_UNKNOWN) {
            flights[key].statusCode = statusCode;

            if (statusCode == STATUS_CODE_LATE_AIRLINE) {
                // airline is late, credit insured amount to passengers
                uint256 numInsurees = flights[key].insurees.length;
                for (uint256 i = 0; i < numInsurees; i++) {
                    creditInsuree(flights[key].insurees[i], key);
                }
            }
        }
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {}
}
