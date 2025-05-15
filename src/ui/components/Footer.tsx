import React from "react"
import styled from "styled-components"
import { Content } from "./PluginLayout"

export function Footer() {
	return (
		<Content bottom center>
			<div>This is not a supported product. Hopefully it helps though.</div>
			<div>
				© 2025 Thierry Charbonnel
				{" • "}
				<StyledLink href="mailto:thierry@anaotherplanet.io?subject=Variables Import feedback" target="_blank">
					Feedback
				</StyledLink>
				{" • "}
				<StyledLink href="https://github.com/thierryc/figma-variables-import" target="_blank">
					GitHub
				</StyledLink>
			</div>
		</Content>
	)
}
export default Footer

const StyledLink = styled.a`
	color: var(--figma-color-text-brand, #007be5);
	text-decoration: none;
`
