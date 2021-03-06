import React, {useContext, useState, useEffect} from "react";
import PropTypes from "prop-types";
import * as Component from "../components";
import {MatchContext} from "../contexts/match";
import {SettingsContext} from "../contexts/settings";
import style from "./team-selector.module.css";
import * as TBA from "../TBA";
import {db} from "../firebase";

// parse the matchKey to readable format. this will later be stored in the store.match
const parseMatch = matchKey => {
	const tokens = matchKey.split(/\d+/);
	const parsedTokens = tokens.map(token => {
		switch(token) {
		case "qf":
			return "Quarter Final";
		case "sf":
			return "Semi Final";
		case "f":
			return "Final";
		case "qm":
			return "Qualifier";
		case "m":
			return "Match";
		default:
			return "";
		}
	});
	const numbers = matchKey.split(/[a-z]+/).slice(1, 3);
	const connected = parsedTokens.filter(word => word).map((word, i) => `${word} ${numbers[i]} `);
	return connected;
};

const Table = props => {
	const {store, dispatch} = useContext(MatchContext);
	const {store: settingStore} = useContext(SettingsContext);
	const [used, setUsed] = useState({});
	// set all the data from TBA in settings
	useEffect(() => {
		TBA.fetchSingleMatchFromEvent(props.match).then(r => {
			// setting initial state of MatchContext.
			dispatch({type: "SET_TEAMID",	value: -1}); // reset team id value
			dispatch({type: "SET_MATCHKEY", value: props.match});
			dispatch({type: "SET_BLUE", value: r.alliances.blue.team_keys.map(team => team.replace("frc", ""))});
			dispatch({type: "SET_RED", value: r.alliances.red.team_keys.map(team => team.replace("frc", ""))});
			dispatch({type: "SET_MATCH", value: parseMatch(props.match.split("_")[1])});
		});
	}, [props.match, dispatch]);

	// set used state when db changes
	useEffect(() => {
		db.ref().child("scouting/" + props.match).on("value", snap => {
			if (snap.val() !== null) {
				setUsed(snap.val());
			} else {
				setUsed({});
			}
		});
		return () => {db.ref().child("scouting/" + props.match).off();};
	}, [props.match]);

	const handleTeamSelect = team => {
		db.ref().child("scouting/" + store.matchKey + "/" + team).set(settingStore.auth.user.displayName);
	};

	return (
		<React.Fragment>
			<h1 className={style.match}>{store.match}</h1>
			<div className={style.container}>
				{
					// display the selection component. if the client chose a team, display its ID instead.
					store.teamID !== -1 ? ( // -1 is the defualt value of the ID.
						<h4 className={style.team}>Team #{store.teamID}</h4>
					) : (
						<React.Fragment>
							{
								store.blue.map((team, index) => (
									<Component.ButtonGroup key={team}>
										<Component.Button
											tinted="true"
											color={Object.keys(used).includes(team) ? "" : "blue"}
											disabled={Object.keys(used).includes(team) && used[team] !== settingStore.auth.user.displayName}
											onClick={() => {
												dispatch({
													type: "SET_TEAMID",
													value: team,
												});
												dispatch({type: "BLUE_ALLIANCE"});
												handleTeamSelect(team);
											}}
										>
											{`${team} ${used[team] ? `(${used[team]})` : ""}`}
										</Component.Button>
										<Component.Button
											tinted="true"
											color={Object.keys(used).includes(store.red[index]) ? "" : "red"}
											disabled={Object.keys(used).includes(store.red[index]) && used[store.red[index]] !== settingStore.auth.user.displayName}
											onClick={() => {
												dispatch({
													type: "SET_TEAMID",
													value: store.red[index],
												});
												dispatch({type: "RED_ALLIANCE"});
												handleTeamSelect(store.red[index]);
											}}
										>
											{`${store.red[index]} ${used[store.red[index]] ? `(${used[store.red[index]]})` : ""}`}
										</Component.Button>
									</Component.ButtonGroup>
								))
							}
						</React.Fragment>
					)
				}
			</div>
		</React.Fragment>
	);
};

Table.propTypes = {
	match: PropTypes.string,
};

export default Table;
