import React from "react"
import styled from "styled-components"

const SwitchContainer = styled.label`
	--size: 15px;
	--width: calc(var(--size, 30px) * 1.6);
	display: inline-block;
	position: relative;
	width: var(--width);
	height: var(--size, 30px);
`

const SwitchInput = styled.input`
	opacity: 0;
	width: 0;
	height: 0;
`

const SwitchSlider = styled.span`
	position: absolute;
	cursor: pointer;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: var(--figma-color-bg-disabled, #d9d9d9);
	border-radius: 30px;
	transition: background-color 0.3s;

	&::before {
		position: absolute;
		content: "";
		height: calc(var(--size, 30px) - 4px);
		width: calc(var(--size, 30px) - 4px);
		left: 2px;
		bottom: 2px;
		background-color: var(--figma-color-icon-oninverse, rgba(255, 255, 255, 0.9));
		border-radius: 50%;
		transition: transform 0.2s;
	}

	${SwitchInput}:checked + &::before {
		transform: translateX(calc(var(--width) - var(--size)));
	}

	${SwitchInput}:checked + & {
		background-color: var(--figma-color-bg-brand, #0d99ff);
	}
`

interface SwitchProps {
	checked: boolean
	onChange: (checked: boolean) => void
}

function Switch({ checked, onChange }: SwitchProps) {
	const handleSwitchChange = () => {
		const newChecked = !checked
		onChange(newChecked)
	}

	return (
		<SwitchContainer>
			<SwitchInput type="checkbox" checked={checked} onChange={handleSwitchChange} />
			<SwitchSlider />
		</SwitchContainer>
	)
}

export default Switch
